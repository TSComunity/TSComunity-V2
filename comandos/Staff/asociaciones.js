const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Asociacion = require("../../Esquemas/asociacionesSchema.js"); // Cambia al modelo correcto

// IDs de categorías válidas para asociaciones
const { asociations } = require('../../configs/config.js')


module.exports = {
    data: new SlashCommandBuilder()
      .setName("asociaciones")
      .setDescription("Comandos para manejar asociaciones.")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("agregar")
          .setDescription("Crea y asocia un canal de texto a tu lista.")
          .addStringOption((option) =>
            option.setName("emoji").setDescription("El emoji del canal a crear.").setRequired(true)
          )
          .addStringOption((option) =>
            option.setName("nombre").setDescription("El nombre del canal a crear.").setRequired(true)
          )
          .addChannelOption((option) =>
            option
              .setName("categoria")
              .setDescription("La categoría donde se creará el canal.")
              .setRequired(true)
              .addChannelTypes(4) // Solo categorías
          )
          .addNumberOption((option) =>
            option
              .setName("renovacion-dias")
              .setDescription("Número de días hasta la renovación.")
              .setRequired(true)
          )
          .addUserOption((option) =>
            option
              .setName("representante")
              .setDescription("Elige al representante responsable de esta asociación.")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("desasignar")
          .setDescription("Desasigna un canal.")
          .addChannelOption((option) =>
            option.setName("canal").setDescription("El canal a desasignar.").setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("editar")
          .setDescription("Edita una asociación.")
          .addChannelOption((option) =>
            option
              .setName("canal")
              .setDescription("El canal a editar.")
              .setRequired(true)
          )
          .addUserOption((option) =>
            option
              .setName("encargado")
              .setDescription("El staff asignado al canal.")
              .setRequired(false)
          )
          .addIntegerOption((option) =>
            option
              .setName("duracion")
              .setDescription("Cada cuento se renueva la asocición.")
              .setRequired(false)
          )
          .addUserOption((option) =>
            option
              .setName("representante")
              .setDescription("El representante de la asociación.")
              .setRequired(false)
          )
      ).addSubcommand((subcommand) =>
        subcommand
          .setName("top")
          .setDescription("Top de renovación de asociciones.")
      ),
  
    async execute(interaction) {
      const subcommand = interaction.options.getSubcommand();
  
      switch (subcommand) {
        case "agregar": {
          

          const ROLES_PERMITIDOS = ['1106553480803516437', '1107345436492185753', '1106553536839422022', '1363927756617941154', '1202685031219200040']

          const tienePermiso = interaction.member.roles.cache.some(role =>
            ROLES_PERMITIDOS.includes(role.id)
          );
    
          if (!tienePermiso) {
            return interaction.reply({
             content: '🚫 No tienes permiso para usar este comando.',
              ephemeral: true
            });
          }

          const emoji = interaction.options.getString("emoji");
          const nombre = interaction.options.getString("nombre");
          const categoria = interaction.options.getChannel("categoria");
          const renovacion = interaction.options.getNumber("renovacion-dias");
          const representante = interaction.options.getUser("representante");
  
        if (!asociations.categories.includes(categoria.id)) {
          return interaction.reply({
            content: '🚫 No puedes crear asociaciones fuera de las categorías permitidas.',
            ephemeral: true
          });
        }

          // Crear el canal en la categoría especificada
          const canal = await interaction.guild.channels.create({
            name: `「${emoji}」${nombre}`,
            type: 0, // Tipo de canal de texto
            parent: categoria.id,
          });
  
          // Guardar la asociación en la base de datos
          const nuevaAsociacion = new Asociacion({
            Representante: representante.id,
            Renovacion: renovacion,
            Canal: canal.id,
            Categoria: categoria.id,
          });

          const embed = new EmbedBuilder()
            .setTitle("Nueva Asociación Creada")
            .addFields(
              { name: "Canal", value: `<#${canal.id}>`, inline: true },
              { name: "Renovación", value: `${renovacion} días`, inline: true },
              { name: "Representante", value: `<@${representante.id}>`, inline: true }
            )
            .setColor("#0099ff") // Puedes cambiar el color
            .setTimestamp() // Añadir un timestamp si lo deseas
            .setFooter({ text: "Asociación creada correctamente." });
  
          await nuevaAsociacion.save();
          return interaction.reply(
            { embeds: [embed]}
          );
        }
  
        case "desasignar": {

          const ROLES_PERMITIDOS = ['1106553480803516437', '1107345436492185753', '1106553536839422022', '1363927756617941154', '1202685031219200040']

          const tienePermiso = interaction.member.roles.cache.some(role =>
            ROLES_PERMITIDOS.includes(role.id)
          );
    
          if (!tienePermiso) {
            return interaction.reply({
             content: '🚫 No tienes permiso para usar este comando.',
              ephemeral: true
            });
          }

          const canal = interaction.options.getChannel("canal");
  
if (!asociations.categories.includes(canal.parentId)) {
  return interaction.reply({
    content: '🚫 Este canal no pertenece a las categorías de asociaciones.',
    ephemeral: true
  });
}

          const resultado = await Asociacion.deleteOne({
            Canal: canal.id,
          });
  
          if (resultado.deletedCount > 0) {
            return interaction.reply(`Canal ${canal} desasignado correctamente.`);
          } else {
            return interaction.reply("No se encontró el canal en tus asociaciones.");
          }
        }
  
        case "editar": {

          const ROLES_PERMITIDOS = ['1106553480803516437', '1107345436492185753', '1106553536839422022', '1363927756617941154', '1202685031219200040'];

          const tienePermiso = interaction.member.roles.cache.some(role =>
            ROLES_PERMITIDOS.includes(role.id)
          );
          
          if (!tienePermiso) {
            return interaction.reply({
              content: '🚫 No tienes permiso para usar este comando.',
              ephemeral: true
            });
          }
          
          const canal = interaction.options.getChannel("canal");
          const encargado = interaction.options.getUser("encargado");
          const duracion = interaction.options.getInteger("duracion");
          const representante = interaction.options.getUser("representante");
          
if (!asociations.categories.includes(canal.parentId)) {
  return interaction.reply({
    content: '🚫 Este canal no pertenece a una categoría de asociaciones.',
    ephemeral: true
  });
}

          const data = await Asociacion.findOne({ Canal: canal.id });
          
          if (!data) {
            await Asociacion.create({
              Canal: canal.id,
              Asignado: encargado ? encargado.id : null,
              Renovacion: duracion || null,
              Representante: representante ? representante.id : null,
            });
            const embed = new EmbedBuilder()
            .setTitle('Asociación Editada')
            .setColor('Purple')
            .addFields(
              { name: 'Canal', value: `<#${canal.id}>`, inline: true },
              { name: 'Encargado', value: encargado ? `<@${encargado.id}>` : 'Sin cambios', inline: true },
              { name: 'Renovación', value: duracion ? duracion.toString() : 'Sin cambios', inline: true },
              { name: 'Representante', value: representante ? `<@${representante.id}>` : 'Sin cambios', inline: true },
            );
                      return interaction.reply({ embeds: [embed] });
          }
          
          // Actualizar datos
          data.Asignado = encargado?.id || data.Asignado;
          data.Renovacion = (duracion !== null && duracion !== undefined) ? duracion : data.Renovacion;
          data.Representante = representante?.id || data.Representante;
          
          await data.save();
          
          // Crear embed
          const embed = new EmbedBuilder()
            .setTitle('Asociación Editada')
            .setColor('Purple')
            .addFields(
              { name: 'Canal', value: `<#${canal.id}>`, inline: true },
              { name: 'Encargado', value: encargado ? `<@${encargado.id}>` : 'Sin cambios', inline: true },
              { name: 'Renovación', value: duracion ? duracion.toString() : 'Sin cambios', inline: true },
              { name: 'Representante', value: representante ? `<@${representante.id}>` : 'Sin cambios', inline: true },
            );
          
          return interaction.reply({ embeds: [embed] });
          
        }

        case 'top': {

          const ROLES_PERMITIDOS = ['1106553480803516437', '1107345436492185753', '1106553536839422022', '1363927756617941154', '1202685031219200040', '959153630328528976']

          const tienePermiso = interaction.member.roles.cache.some(role =>
            ROLES_PERMITIDOS.includes(role.id)
          );
    
          if (!tienePermiso) {
            return interaction.reply({
             content: '🚫 No tienes permiso para usar este comando.',
              ephemeral: true
            });
          }

        const staffData = require('../../Esquemas/staffStats.js'); // Cargar el esquema de staff

        try {
            // Buscar todos los documentos de usuarios y ordenarlos por renovaciones en orden descendente
            const ranking = await staffData.find().sort({ Renovaciones: -1 }); // Limitar a los primeros 10

            if (ranking.length === 0) {
                return interaction.reply('No hay datos de renovaciones disponibles.');
            }

            // Construir una cadena de texto con los primeros 10 puestos
            let topText = '';
            ranking.forEach((user, index) => {
              if (user.ID) {
                topText += `\`${(index + 1).toString().padStart(3, '0')} -${user.Renovaciones.toString().padStart(7, ' ')} → \`<@${user.ID}>\n`
              }
            })

            // Crear el embed con la información
            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle('Top de Renovaciones')
                .setDescription(`\` ## - Puntos - Usuario                     \`\n${topText}`)

            // Enviar el embed al canal
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error al obtener el ranking:', error);
            return interaction.reply('Hubo un error al obtener el ranking de renovaciones.');
        }
      }

        default:
          return interaction.reply("Comando no reconocido.");
      }
    },
  };
  
