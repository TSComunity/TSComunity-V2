const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const Schema = require('../Esquemas/clubsSchema'); // Ajusta la ruta si es diferente
const countries = require('../json/countries.json');

module.exports = async function actualizarClubes(client) {
    try {
        const token = process.env.BS_APIKEY;
        const data = await Schema.find();
        const totalClubes = data.length;

        let totalCopas = 0;
        let totalMiembros = 0;
        let totalVices = 0;
        let totalVeteranos = 0;

        const clubDetalles = [];

        for (const doc of data) {
            const countri = doc.Region || 'España';
            const { codigo: countriCode, emoji: countriEmoji } = countries[countri] || {};
            const clubTag = doc.ClubTag;

            try {
                const [clubRes, rankingRes, globalRankingRes] = await Promise.all([
                    axios.get(`https://api.brawlstars.com/v1/clubs/%23${clubTag}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`https://api.brawlstars.com/v1/rankings/${countriCode}/clubs`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`https://api.brawlstars.com/v1/rankings/global/clubs`, { headers: { Authorization: `Bearer ${token}` } }),
                ]);

                const club = clubRes.data;
                totalCopas += club.trophies;
                totalMiembros += club.members.length;
                totalVices += club.members.filter(m => m.role === 'vicePresident').length;
                totalVeteranos += club.members.filter(m => m.role === 'senior').length;

                const presi = club.members.find(m => m.role === 'president');
                const presiName = presi ? presi.name : 'No disponible';

                let tipo = club.type;
                if (tipo === "inviteOnly") tipo = "<:iva:1467127419088666727> Invitación";
                else if (tipo === "open") tipo = "<:ivb:1467127417364811917> Abierto";
                else if (tipo === "closed") tipo = "<:ivc:1467127831078375569> Cerrado";

                const globalClub = globalRankingRes.data.items.find(c => c.tag === `#${clubTag}`);
                const globalRanking = globalClub ? `<:earth:1467116653149032565> \`#${globalClub.rank}\` ` : '';

                const localClub = rankingRes.data.items.find(c => c.tag === `#${clubTag}`);
                const localRanking = localClub ? `${countriEmoji} \`#${localClub.rank}\`\n` : '';

                clubDetalles.push({
                    name: `**ㅤ**`,
                    value:
                        `<:CoronaAzulao:1237349756347613185> **[${club.name}](https://brawltime.ninja/es/club/${clubTag.replace('#', '')})**\n` +
                        `<:copa:1467126361864016025> \`${club.trophies.toLocaleString()}\`\n` +
                        `${globalRanking}${localRanking}` +
                        `<:Presidente:1394255607934226473> [${presiName}](https://brawltime.ninja/es/profile/${presi.tag.replace('#', '')})\n` +
                        `<:req:1385558827826544640> \`${club.requiredTrophies.toLocaleString()}\`\n` +
                        `<:Miembros:1394255798930247801> \`${club.members.length}\`\n` +
                        `${tipo}`,
                    trophies: club.trophies
                });

            } catch (err) {
                console.error(`Error en el club ${clubTag}:`, err.message);
                clubDetalles.push({
                    name: `Error en el club ${clubTag}`,
                    value: `No se pudieron obtener datos.`,
                    trophies: 0
                });
            }
        }

        clubDetalles.sort((a, b) => b.trophies - a.trophies);

        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleString('es-ES', {
            timeZone: 'Europe/Madrid',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });

        const resumenEmbed = new EmbedBuilder()
            .setDescription(`# Info Clubes TS`)
            .setThumbnail(client.user.avatarURL())
            .addFields(
                { name: 'Total Trofeos:', value: `<:copa:1467126361864016025> \`${totalCopas.toLocaleString()}\``, inline: true },
                { name: 'Total Clubs:', value: `<:Club:1467114516851720266> \`${totalClubes}\``, inline: true },
                { name: 'Total Miembros:', value: `<:Miembros:1394255798930247801> \`${totalMiembros}\``, inline: true },
                { name: 'Promedio Trofeos:', value: `<:copa:1467126361864016025> \`${Math.round(totalCopas / totalClubes).toLocaleString()}\``, inline: true },
                { name: 'Total Vices:', value: `<:Vice:1394255693305085994> \`${totalVices}\``, inline: true },
                { name: 'Total Veteranos:', value: `<:vete:1467126232326868992> \`${totalVeteranos}\``, inline: true }
            )
            .setColor('#822ffd');

        const pageEmbed = ({ index, clubes }) => {
            return new EmbedBuilder()
                .setDescription(`# Clubes TS - Página ${index}`)
                .setColor('#10ceec')
                .setFooter({ text: `Última actualización: ${formattedDate}`, iconURL: client.user.avatarURL() })
                .addFields(clubes.map(club => ({ name: club.name, value: club.value, inline: true })));
        };

        const channel = await client.channels.fetch('1102591330070302862');
        if (!channel || !channel.isTextBased())
            throw new Error('Canal no encontrado o no es de texto.');

        const fetchedMessages = await channel.messages.fetch({ limit: 100 });
        const sortedMessages = Array.from(fetchedMessages.values()).sort(
            (a, b) => a.createdTimestamp - b.createdTimestamp
        );
        const botMessages = sortedMessages.filter(
            (msg) => msg.author.id === client.user.id
        );

        const summaryMsg = botMessages[0]; // Primer mensaje → resumen
        const clubsMsgs = botMessages.slice(1); // El resto → páginas

        function agruparEnBloques(array, tamano = 15) {
            const bloques = [];
            for (let i = 0; i < array.length; i += tamano) {
                bloques.push(array.slice(i, i + tamano));
            }
            return bloques;
        }
        const pages = agruparEnBloques(clubDetalles);

        // 📌 Si no existe resumen, crearlo
        if (!summaryMsg) {
            await channel.send({ embeds: [resumenEmbed] });
        } else {
            await summaryMsg.edit({ embeds: [resumenEmbed] }).catch(() => {});
        }

        // 📌 Borrar páginas sobrantes
        if (clubsMsgs.length > pages.length) {
            for (let i = pages.length; i < clubsMsgs.length; i++) {
                await clubsMsgs[i].delete().catch(() => {});
            }
        }

        // 📌 Crear páginas que falten
        if (clubsMsgs.length < pages.length) {
            let index = clubsMsgs.length + 1;
            for (let i = clubsMsgs.length; i < pages.length; i++) {
                await channel.send({ embeds: [pageEmbed({ index, clubes: pages[i] })] });
                index++;
            }
        }

        // 📌 Editar páginas existentes
        for (let i = 0; i < pages.length; i++) {
            const msg = clubsMsgs[i];
            if (!msg) continue;
            await msg.edit({ embeds: [pageEmbed({ index: i + 1, clubes: pages[i] })] }).catch(() => {});
        }

    } catch (error) {
        console.error(`Error en el proceso de actualización: ${error}`);
    }
};
            
