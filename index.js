require('dotenv').config()
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  ChannelType,
  AttachmentBuilder
} = require("discord.js");

const Canvas = require('canvas');
const axios = require('axios');
const path = require('path');
const { exec } = require('node:child_process');

const { loadEvents } = require("./Handlers/cargarEventos");
const { loadCommands } = require("./Handlers/cargarComandos");
const { loadPrefix } = require('./Handlers/cargarPrefix');
const process = require('node:process');
const token = process.env.TOKEN;
console.log('a')
process.on('unhandledRejection', async (reason, promise) => {
  console.log('Unhandled Rejection error at:', promise, 'reason', reason);
});

process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception', err);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.log('Uncaught Exception Monitor', err, origin);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Si necesitas leer el contenido del mensaje
    GatewayIntentBits.GuildMembers, // Si necesitas acceder a miembros
  ],
  partials: [
    Partials.Channel, // Si usas canales parciales (DMs, etc.)
  ],
  allowedMentions: {
    parse: ['users', 'roles', 'everyone'],
    repliedUser: false
  }
});

client.commands = new Collection();
client.prefixs = new Collection();
client.aliases = new Collection();
console.log('b')
client.login(token).then(async () => {
  console.log('c')
  loadEvents(client);
  loadCommands(client);
  loadPrefix(client);
});

module.exports = client;

const BRAWL_STARS_API_KEY = process.env.BS_APIKEY

const actualizarClubes = require('./Funciones/actualizarClubes.js');
setInterval(() => actualizarClubes(client), 1000 * 60 * 15);

const Schema = require('./Esquemas/clubsSchema.js')
setInterval(async () => {
    const token = process.env.BS_APIKEY
    const data = await Schema.find()
    const guild = client.guilds.cache.get('1093864130030612521')
    const channel = guild.channels.cache.get('1335991815026905159')
    const timeStampt = await channel.messages.fetch('1335992875753930825')
    const message = await channel.messages.fetch('1335992876856774697')

    const now = new Date();
    const formattedDate = now.toLocaleString('es-ES', { 
        timeZone: 'Europe/Madrid',
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
    })
    const members = `+${Math.floor(guild.memberCount / 100) * 100}`
    const clubs = data.length
    const clubsDetails = []

    for (const doc of data) {
    try {
        const clubTag = doc.ClubTag
        const response = await axios.get(`https://api.brawlstars.com/v1/clubs/%23${clubTag}`, {
            headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            },
        })
        const countries = require('./json/countries.json')
        const countri = doc.Region ? doc.Region : 'España'
        const countriCode = countries[countri].codigo
        const countriEmoji = countries[countri].emoji
        const responseRankings = await axios.get(`https://api.brawlstars.com/v1/rankings/${countriCode}/clubs`, {
            headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            },
        })
        const club = response.data
        const name = club.name
        const trophies = `${club.trophies.toLocaleString('es').padEnd(10)}🏆`
        const requiredTrophies = club.requiredTrophies < 1000 ? `+ ${club.requiredTrophies} 🏆` : `+ ${club.requiredTrophies / 1000}k 🏆`
        // const members = club.members.length < 10 ? `0${club.members.length}/30 👤` : `${club.members.length}/30 👤`

        const rankings = responseRankings.data
        const rankingClubs = rankings.items
        const findClubRanking = rankingClubs.find((c) => c.tag === `#${clubTag}`)
        const clubRanking = findClubRanking ? `Rank #${findClubRanking.rank.toString().padEnd(4)}${countriEmoji}` : ''

        clubsDetails.push({
            'value': `${name.padEnd(17)}${trophies.padEnd(17)}${requiredTrophies.padEnd(17)}${clubRanking}`,
            'trophies': club.trophies
        })
    } catch (error) {
        console.error(`Error al obtener datos para el club con tag ${doc.ClubTag}:`, error)
    }
    }
timeStampt.edit(`
# Plantilla de Promoción de Clubes
> Esta plantilla, pensada para promocionar los clubes de la comunidad en canales cómo <#1211751809534660608> de otros servidores es editada automaticamente con información del servidor y los clubes de la comunidad cada 2 minutos.
    
## Cómo y quién puede promocionar
> Cualquier usuario con acceso a este canal podra utilizar la plantilla.
> 
> **Pasos a seguir:**
> - **1. Copia la plantilla en tu portapapeles.**
> *Asegurate de hacerlo cada vez que quieras promocionar, para que la plantilla incluya información actualizada.*
> - **2. Únete a un servidor y ve a su canal pensado para promocionar clubes.**
> *En este servidor el canal seria <#1211751809534660608>.*
> - **3. Pega la plantilla en el canal.**
> *Asegurate de que en los anteriores 2 mensajes nadie haya publicado la plantilla.*
    
## Servidores donde se puede promocionar
> [GuilleVGX - Brawl Stars](https://discord.gg/77sQHhmZkm)
> [GoDeik TEAM](https://discord.gg/h2mSWgcMag)
> [Templo de los ricochets (iKaoss community)](https://discord.gg/6VhNHVMgcr)
> [Rol & Role coaching](https://discord.gg/b7eZh27aDH)
> [Brawl Stars Fénix](https://discord.gg/T2QCXxXX8a)
> [ELPIPEKAS - BRAWL STARS](https://discord.gg/pPpdwrMuBk)
> [Pizza BS](https://discord.gg/jcmeX4bS9g)
> [Cats World BS](https://discord.gg/n6qqa5CyN7)
> [Team Turtle](https://discord.gg/jg9Yet8pNW)
    
*Plantilla actualizada cada 2 min, última actualización a las \`${formattedDate}\`.*
    ** **
`)
const clubsValues = clubsDetails
.sort((a, b) => b.trophies - a.trophies)
.map(item => item.value)
.join('\n')

message.edit(`
# \`T\` \`S\`   \`C\` \`O\` \`M\` \`U\` \`N\` \`I\` \`T\` \`Y\`
** **
**__Somos una amplia cadena de clubes que cuenta cuenta con clubes tanto en el top Español como en el Global __**
   
### 📙 QUE OFRECEMOS
> - \`${clubs}\` clubes de Brawl Stars
> - Comunidad de Discord con \`${members}\` miembros
> - Staff experimentado en la creación de clubes

### 🔎 QUE BUSCAMOS
> - Miembros activos para nuestros clubes
> - Personas interesadas en la creación de clubes

### 🛡️ NUESTROS CLUBES
\`\`\`${clubsValues}\`\`\`

### 📨 ¡INTERESADOS AL MD!
`)
}, 1000 * 60 * 15)

// CANALES PARA BORRAR MENSAJES BORrAR EL DE HALLOWEEN
const canales = ['1112754769472270449']

async function borrarMensajes() {
    for (const channelId of canales) {
        try {
            const servidor = await client.guilds.fetch('1093864130030612521');
            const channel = await servidor.channels.fetch(channelId);
            if (!channel || channel.type !== ChannelType.GuildText) {
                console.warn(`El canal con ID ${channelId} no es un canal de texto válido o no se encontró.`);
                continue;
            }

            setInterval(async () => {
                try {
                    const fetched = await channel.messages.fetch({ limit: 100 });
                    const messagesToDelete = fetched.filter(message => !message.pinned);
                    
                    for (const message of messagesToDelete.values()) {
                        await message.delete().catch(err => console.error(`Error al borrar el mensaje con ID ${message.id}:`, err));
                    }
                } catch (error) {
                    console.error(`Error al borrar mensajes del canal ${channelId}:`, error);
                }
            }, 5000); // Ejecuta cada 5 segundos
        } catch (error) {
            console.error(`Error al acceder al canal ${channelId}:`, error);
        }
    }
}
borrarMensajes()


const TAG       = "TS"
const ROLE_ID   = "1380228270729199798"
const ROLE_NAME = "Etiqueta TS"
const GUILD_ID  = "1093864130030612521"
const THREAD_ID = "1470813578964504656"
const EMOJI     = "<:tag:1470863668051837059>"

const REQUEST_DELAY = 800

let clientRef    = null
let guildRef     = null
let threadRef    = null
let membersArray = []
let scanIndex    = 0
let scanRunning  = false

const processing    = new Set()
const priorityQueue = []

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchTag(userId) {
  while (true) {
    try {
      const res = await axios.get(
        `https://discord.com/api/v10/users/${userId}`,
        { headers: { Authorization: `Bot ${clientRef.token}` } }
      )
      return res.data.primary_guild || res.data.clan || null
    } catch (err) {
      if (err.response?.status === 429) {
        const retry = err.response.data?.retry_after ?? 1
        console.warn(`[TAG] Rate limit en ${userId}, esperando ${retry}s`)
        await sleep(retry * 1000 + 100)
        continue
      }
      return null
    }
  }
}

async function applyRole(member, hasCorrectTag) {
  const hasRole = member.roles.cache.has(ROLE_ID)

  if (hasCorrectTag && !hasRole) {
    await member.roles.add(ROLE_ID).catch(() => {})
    console.log(`[TAG] + Rol añadido a ${member.user.tag}`)

    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setAuthor({
              name: interaction.guild.name,
              iconURL: interaction.guild.iconURL()
            })
            .setDescription(
              `### ${EMOJI} Etiqueta detectada\n` +
              `Se te ha otorgado el rol **${ROLE_NAME}** por tener la etiqueta ${EMOJI} **${TAG}**`
            )
            .setTimestamp()
        ]
      })
    } catch (err) {
      // Usuario con DMs cerrados, ignoramos
    }

    if (threadRef) {
      await threadRef.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setDescription(
              `### ${EMOJI} Etiqueta establecida\n` +
              `Rol <@&${ROLE_ID}> otorgado a <@${member.user.id}> por tener la etiqueta ${EMOJI} **${TAG}**`
            )
            .setTimestamp()
        ]
      }).catch(() => {})
    }
  }

  if (!hasCorrectTag && hasRole) {
    await member.roles.remove(ROLE_ID).catch(() => {})
    console.log(`[TAG] - Rol quitado a ${member.user.tag}`)

    // DM al usuario
    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setAuthor({
              name: interaction.guild.name,
              iconURL: interaction.guild.iconURL()
            })
            .setDescription(
              `${EMOJI} Etiqueta eliminada\n` +
              `Se te ha retirado el rol **${ROLE_NAME}** por no tener la etiqueta ${EMOJI} **${TAG}**`
            )
            .setTimestamp()
        ]
      })
    } catch (err) {
      // Ignoramos si no se puede enviar el MD
    }

    if (threadRef) {
      await threadRef.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setDescription(
              `### ${EMOJI} Etiqueta retirada\n` +
              `Rol <@&${ROLE_ID}> retirado a <@${member.user.id}> por no tener la etiqueta ${EMOJI} **${TAG}**`
            )
            .setTimestamp()
        ]
      }).catch(() => {})
    }
  }
}

async function verifyMember(member) {
  if (!member || member.user?.bot) return
  if (processing.has(member.id)) return

  processing.add(member.id)
  try {
    const tagData = await fetchTag(member.id)

    await member.fetch().catch(() => {})

    const hasCorrectTag =
      tagData?.tag === TAG &&
      tagData?.identity_guild_id === GUILD_ID

    await applyRole(member, hasCorrectTag)
  } catch (err) {
    console.error(`[TAG] Error verificando ${member?.user?.tag}:`, err.message)
  } finally {
    processing.delete(member.id)
  }
}

async function mainLoop() {
  if (scanRunning) return
  scanRunning = true

  console.log("[TAG] Motor iniciado")

  while (true) {
    let member = null

    if (priorityQueue.length > 0) {
      const id = priorityQueue.shift()
      member = guildRef.members.cache.get(id)
        ?? await guildRef.members.fetch(id).catch(() => null)
    }

    if (!member) {
      if (scanIndex >= membersArray.length) {
        scanIndex = 0
        membersArray = [...guildRef.members.cache.values()].filter(m => !m.user.bot)
        console.log(`[TAG] Nuevo ciclo — ${membersArray.length} miembros`)
      }

      member = membersArray[scanIndex]
      scanIndex++
    }

    if (member) await verifyMember(member)

    await sleep(REQUEST_DELAY)
  }
}

function enqueuePriority(id) {
  if (!priorityQueue.includes(id) && !processing.has(id)) {
    priorityQueue.unshift(id)
  }
}

async function tagRoleManager(client) {
  clientRef = client

  guildRef = await client.guilds.fetch(GUILD_ID)
  await guildRef.members.fetch()

  membersArray = [...guildRef.members.cache.values()].filter(m => !m.user.bot)
  console.log(`[TAG] Iniciado — ${membersArray.length} miembros`)

  threadRef = await client.channels.fetch(THREAD_ID).catch(() => null)
  if (!threadRef) console.warn("[TAG] Thread de log no encontrado")

  client.on("messageCreate", msg => {
    if (!msg.inGuild() || msg.guild.id !== GUILD_ID) return
    if (msg.author.bot) return
    enqueuePriority(msg.author.id)
  })

  client.on("guildMemberUpdate", (_, newMember) => {
    if (newMember.guild.id !== GUILD_ID) return
    enqueuePriority(newMember.id)
  })

  client.on("guildMemberAdd", member => {
    if (member.guild.id !== GUILD_ID) return
    membersArray.push(member)
    enqueuePriority(member.id)
  })

  client.on("guildMemberRemove", member => {
    if (member.guild.id !== GUILD_ID) return
    membersArray = membersArray.filter(m => m.id !== member.id)
  })

  mainLoop()
}

client.once('ready', () => {
  console.log(`[BOT] Listo como ${client.user.tag}`);
  tagRoleManager(client);
});