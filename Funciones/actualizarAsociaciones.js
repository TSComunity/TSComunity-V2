const {
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MediaComponentBuilder,
  ThumbnailBuilder,
  SectionBuilder,
  SeparatorBuilder,
  MessageFlags,
  EmbedBuilder
} = require('discord.js')
const Asociacion = require('../Esquemas/asociacionesSchema')


// Constante para el prefijo de canales de staff
const STAFF_CHANNEL_PREFIX = '﹏︿'

module.exports = async function actualizarListaAsociaciones(client) {
  try {
    const TARGET_CHANNEL_ID = '1339987513401413735'

    // -------------------------
    // helpers
    // -------------------------
    const isV2 = (msg) => Boolean((msg.flags ?? 0) & MessageFlags.IsComponentsV2)

    /**
     * Función de comparación personalizada para ordenar canales considerando formato especial
     */
    const compareChannelNames = (nameA, nameB) => {
      if (!nameA && !nameB) return 0
      if (!nameA) return 1
      if (!nameB) return -1
      
      const cleanNameA = nameA.replace(/[^\w\s-]/g, '').trim() || nameA
      const cleanNameB = nameB.replace(/[^\w\s-]/g, '').trim() || nameB
      
      return cleanNameA.localeCompare(cleanNameB, 'es', { 
        sensitivity: 'base', 
        numeric: true
      })
    }

    /**
     * Helper para obtener el nombre del canal desde un objeto aso o ID de canal
     */
    const getChannelName = (asoOrChannelId) => {
      try {
        const channelId = typeof asoOrChannelId === 'string' ? asoOrChannelId : String(asoOrChannelId.Canal)
        const ch = client.channels.cache.get(channelId)
        return ch ? ch.name : ''
      } catch {
        return ''
      }
    }

    /**
     * Crea un ContainerBuilder para una lista de asociaciones (una "división")
     */
    function createContainerForAsociation(asociation) {
      const asignado = asociation[0]?.Asignado || 'SinAsignar'
      const ahora = Date.now()

      // Calcular asociaciones renovadas si hay un asignado
      let renovadas = 0
      if (asignado !== 'SinAsignar' && asociation.length > 0) {
        renovadas = asociation.filter(aso => {
          if (!aso.UltimaRenovacion) return false
          const msRenovacion = (aso.Renovacion || 0) * 24 * 60 * 60 * 1000
          return (ahora - new Date(aso.UltimaRenovacion).getTime()) < msRenovacion
        }).length
      }

      const container = new ContainerBuilder()
        .setAccentColor(asignado === 'SinAsignar' ? 0xffcc00 : 0x00b0f4)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            asignado === 'SinAsignar'
              ? `### 📋 Sin asignar — ${asociation.length}`
              : `### 📌 <@${asignado}> — ${renovadas}/${asociation.length}`
          )
        )

      if (!asociation || asociation.length === 0) {
        container
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              asignado === 'SinAsignar'
                ? '> *No hay asociaciones sin asignar.*'
                : '> *El usuario no tiene asociaciones asignadas.*'
            )
          )
        return container
      }

      for (const aso of asociation) {
        if (asignado !== 'SinAsignar') {
          const renovacionTimestamp = aso.UltimaRenovacion
            ? Math.floor(
                (new Date(aso.UltimaRenovacion).getTime() + aso.Renovacion * 24 * 60 * 60 * 1000) / 1000
              )
            : null

          const msRenovacion = (aso.Renovacion || 0) * 24 * 60 * 60 * 1000
          const renovada = aso.UltimaRenovacion
            ? (ahora - new Date(aso.UltimaRenovacion).getTime()) < msRenovacion
            : false

          const last = aso.UltimaRenovacion ?? null
          const renovacionDays = aso.Renovacion ?? aso.renovacion ?? null

          let estado = '❌'
          if (renovada && last && renovacionDays) {
            const lastMs = new Date(last).getTime()
            if (!Number.isNaN(lastMs)) {
              const renovacionMs = Number(renovacionDays) * 24 * 60 * 60 * 1000
              const venceEn = (lastMs + renovacionMs) - ahora
              const diasParaVencer = venceEn / (24 * 60 * 60 * 1000)

              if (diasParaVencer > 0 && diasParaVencer <= 2) {
                estado = '⚠️'
              } else {
                estado = '✅'
              }
            }
          }

          const tiempoTexto = renovacionTimestamp 
            ? `🗓️ <t:${renovacionTimestamp}:R>` 
            : '🗓️ *Sin fecha definida*'

          container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent([
                `${estado} — ${aso.Canal ? `<#${aso.Canal}>` : '*Sin canal*'}`,
                `${tiempoTexto}`,
                `${aso.Representante ? `<:representante:1340014390342193252> <@${aso.Representante}>` : '<:representante:1340014390342193252> *Sin representante*'}`
              ].join('\n'))
            )
        } else {
          // Para asociaciones sin asignar - diseño más simple
          container
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `${aso.Canal ? `<:canales:1340014379080618035> <#${aso.Canal}>` : '<:canales:1340014379080618035> *Sin canal*'}`
              )
            )
        }
      }

      return container
    }

    /**
     * Crea un Embed resumen
     */
    function createSummaryEmbed(asociationss, sinAsignarCount) {
      const ahora = Date.now()
      const total = asociationss.length

      const sinRenovar = asociationss.filter(a => {
        const last = a.UltimaRenovacion ?? null
        const renovacionDays = a.Renovacion ?? a.renovacion ?? null

        if (!renovacionDays) return true
        if (!last) return true

        const lastMs = (new Date(last)).getTime()
        if (Number.isNaN(lastMs)) return true

        const renovacionMs = Number(renovacionDays) * 24 * 60 * 60 * 1000
        return (ahora - lastMs) > renovacionMs
      }).length

      // Calcular asociaciones renovadas
      const renovadas = total - sinRenovar

      // Calcular asociaciones que vencen pronto (próximos 7 días)
      const vencenPronto = asociationss.filter(a => {
        const last = a.UltimaRenovacion ?? null
        const renovacionDays = a.Renovacion ?? a.renovacion ?? null

        if (!renovacionDays || !last) return false

        const lastMs = (new Date(last)).getTime()
        if (Number.isNaN(lastMs)) return false

        const renovacionMs = Number(renovacionDays) * 24 * 60 * 60 * 1000
        const venceEn = (lastMs + renovacionMs) - ahora
        const diasParaVencer = venceEn / (24 * 60 * 60 * 1000)

        // Está renovada pero vence en los próximos 7 días
        return diasParaVencer > 0 && diasParaVencer <= 2
      }).length

      // Calcular porcentaje de renovación
      const porcentajeRenovacion = total > 0 ? Math.round((renovadas / total) * 100) : 0

      const embed = new EmbedBuilder()
        .setDescription('## 🏠 Resumen de asociaciones')
        .setColor(0x7289DA)
        .addFields(
          { name: '📈 Total', value: `\`${total + sinAsignarCount}\``, inline: true },
          { name: '📋 Sin asignar', value: `\`${sinAsignarCount}\``, inline: true },
          { name: '📊 % Renovación', value: `\`${porcentajeRenovacion}%\``, inline: true },
          { name: '✅ Renovadas', value: `\`${renovadas}\``, inline: true },
          { name: '⚠️ Expiran en < 2 días', value: `\`${vencenPronto}\``, inline: true },
          { name: '❌ Sin Renovar', value: `\`${sinRenovar}\``, inline: true }
        )
        .setTimestamp()

      return embed
    }

    // -------------------------
    // inicio del flujo
    // -------------------------
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID)
    if (!channel || !channel.isTextBased()) throw new Error('Canal no encontrado o no es de texto.')

    const guild = channel.guild

    // Obtenemos canales de las dos categorías (filtramos por parentId y excluimos canales de staff)
    const { asociations } = require('../configs/config.js')
    const canalesEnCategorias = client.channels.cache.filter(ch =>
      ch.isTextBased() && 
      asociations.categories.includes(ch.parentId) &&
      !ch.name.startsWith(STAFF_CHANNEL_PREFIX)
    )

    // Traemos todas las asociaciones con Canal definido
    const todasAsociacionesDB = await Asociacion.find({ Canal: { $ne: null } })

    // Verificamos que el canal existe realmente en el cliente
    const asociationss = (
      await Promise.all(
        todasAsociacionesDB.map(async (aso) => {
          try {
            const fetchedChannel = await client.channels.fetch(aso.Canal)
            if (fetchedChannel && !fetchedChannel.name.startsWith(STAFF_CHANNEL_PREFIX)) {
              return aso
            }
            return null
          } catch {
            return null
          }
        })
      )
    ).filter(Boolean)

    // Set de canales ya registrados
    const canalesRegistrados = new Set(asociationss.map(aso => aso.Canal))

    // Canales en categorías que NO están registrados
    const canalesNoRegistrados = canalesEnCategorias.filter(c => !canalesRegistrados.has(c.id))

    // -------------------------
    // Agrupar y ordenar
    // -------------------------
    const agrupado = asociationss.reduce((acc, aso) => {
      const key = aso.Asignado || 'SinAsignar'
      if (!acc[key]) acc[key] = []
      acc[key].push(aso)
      return acc
    }, {})

    if (!agrupado['SinAsignar']) agrupado['SinAsignar'] = []

    for (const [key, group] of Object.entries(agrupado)) {
      group.sort((a, b) => {
        const nameA = getChannelName(a)
        const nameB = getChannelName(b)
        return compareChannelNames(nameA, nameB)
      })
    }

    const staffEntries = Object.entries(agrupado).filter(([key]) => key !== 'SinAsignar')

    const staffWithNames = await Promise.all(
      staffEntries.map(async ([key, arr]) => {
        let nameFallback = String(key)
        try {
          const cached = guild.members.cache.get(key)
          if (cached) {
            nameFallback = cached.displayName || cached.user.username
          } else {
            const member = await guild.members.fetch(key).catch(() => null)
            if (member) nameFallback = member.displayName || member.user.username
          }
        } catch (e) {
          console.warn(`No se pudo resolver nombre para staff ${key}:`, e.message)
        }
        return { key, name: nameFallback, arr }
      })
    )

    staffWithNames.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))

    const expectedAsociations = [
      ...staffWithNames.map(s => [...agrupado[s.key]]),
      [...agrupado['SinAsignar']]
    ]

    for (const canal of canalesNoRegistrados.values()) {
      expectedAsociations[expectedAsociations.length - 1].push({ 
        Canal: canal.id, 
        Asignado: 'SinAsignar' 
      })
    }

    const sinAsignarGroup = expectedAsociations[expectedAsociations.length - 1]
    sinAsignarGroup.sort((a, b) => {
      const nameA = getChannelName(a)
      const nameB = getChannelName(b)
      return compareChannelNames(nameA, nameB)
    })

    const sinAsignarCount = expectedAsociations[expectedAsociations.length - 1].length

    // -------------------------
    // LÓGICA CORREGIDA DE MENSAJES
    // -------------------------
    
    // Fetch de mensajes con límite aumentado para asegurar que obtenemos todos
    const fetchedMessages = await channel.messages.fetch({ limit: 100 })
    const allBotMessages = Array.from(fetchedMessages.values())
      .filter(msg => msg.author.id === client.user.id)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)

    // Separar mensajes por tipo
    const summaryMsg = allBotMessages.find(msg => !isV2(msg))
    const currentV2Messages = allBotMessages.filter(msg => isV2(msg))

    console.log(`Estado actual: ${allBotMessages.length} mensajes del bot (${summaryMsg ? '1' : '0'} resumen + ${currentV2Messages.length} V2)`)
    console.log(`Estado esperado: ${1 + expectedAsociations.length} mensajes (1 resumen + ${expectedAsociations.length} V2)`)

    const expectedV2Count = expectedAsociations.length
    const currentV2Count = currentV2Messages.length

    // DECISIÓN: Si la estructura cambió significativamente, recrear todo
    const structureChanged = Math.abs(expectedV2Count - currentV2Count) > 0

    if (!summaryMsg || structureChanged) {
      console.log(`${!summaryMsg ? 'Sin mensaje resumen' : 'Estructura cambió'}: Recreando todos los mensajes...`)
      
      // Eliminar TODOS los mensajes existentes del bot
      for (const msg of allBotMessages) {
        try {
          await msg.delete()
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.warn(`Error eliminando mensaje ${msg.id}:`, error.message)
        }
      }

      console.log('Todos los mensajes eliminados. Creando estructura completa...')

      // Crear mensaje resumen
      const summaryEmbed = createSummaryEmbed(asociationss, sinAsignarCount)
      await channel.send({
        embeds: [summaryEmbed],
        allowedMentions: { users: [] }
      })

      console.log('Mensaje resumen creado. Creando mensajes V2...')

      // Crear mensajes V2
      for (let i = 0; i < expectedAsociations.length; i++) {
        const asociation = expectedAsociations[i]
        const container = createContainerForAsociation(asociation)
        
        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [] }
        })
        
        console.log(`Creado mensaje V2 ${i + 1}/${expectedAsociations.length}`)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      console.log('Recreación completa terminada')
      return
    }

    // Si llegamos aquí, solo actualizamos contenido sin cambiar estructura
    console.log('Estructura sin cambios, actualizando contenido...')

    // Actualizar mensaje resumen
    const newSummaryEmbed = createSummaryEmbed(asociationss, sinAsignarCount)
    await summaryMsg.edit({
      embeds: [newSummaryEmbed]
    })

    // Actualizar mensajes V2 existentes
    for (let i = 0; i < Math.min(expectedAsociations.length, currentV2Messages.length); i++) {
      const asociation = expectedAsociations[i]
      const container = createContainerForAsociation(asociation)
      const existingMsg = currentV2Messages[i]

      try {
        await existingMsg.edit({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { users: [] }
        })
        console.log(`Actualizado mensaje V2 ${i + 1}`)
      } catch (error) {
        console.error(`Error actualizando mensaje V2 ${existingMsg.id}:`, error.message)
      }
      
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    console.log('Actualización de contenido completada')

  } catch (error) {
    console.error('Error en actualizarListaAsociaciones:', error.message)
    throw error
  }
}