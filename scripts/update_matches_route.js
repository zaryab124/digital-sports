const fs = require('fs');

let matchRoute = fs.readFileSync('src/app/api/matches/route.ts', 'utf8');

// Add imports
if (!matchRoute.includes("import { sendNotification } from '@/services/notification-service';")) {
  matchRoute = `import { sendNotification } from '@/services/notification-service';
import { publishMatchEvent } from '@/lib/realtime';
` + matchRoute;
}

// Replace opponent captain notification in POST
const notifTarget = `    // 6. Send notifications to opponent captain
    const opponentCaptainId = isHomeCaptain ? awayTeam.captainId : isAwayCaptain ? homeTeam.captainId : null;
    if (opponentCaptainId && !isDraft) {
      await prisma.notification.create({
        data: {
          userId: opponentCaptainId,
          title: 'New Match Proposal Received',
          message: \`Captain \${auth.fullName} has proposed a match: \${homeTeam.name} vs \${awayTeam.name} on \${new Date(scheduledAt).toLocaleString()}.\`,
          type: 'ACTION_REQUIRED',
        },
      });
    }`;

const notifReplacement = `    // 6. Send notifications to opponent captain
    const opponentCaptainId = isHomeCaptain ? awayTeam.captainId : isAwayCaptain ? homeTeam.captainId : null;
    if (opponentCaptainId && !isDraft) {
      await sendNotification({
        userId: opponentCaptainId,
        title: 'New Match Challenge Received! ⚔️',
        message: \`Captain \${auth.fullName} has proposed a match: \${homeTeam.name} vs \${awayTeam.name} on \${new Date(scheduledAt).toLocaleString()}.\`,
        notificationType: 'MATCH_REQUEST',
        type: 'ACTION_REQUIRED',
        linkUrl: \`/matches/\${match.id}\`,
      });

      publishMatchEvent(match.id, 'MATCH_STATUS_UPDATE', {
        matchId: match.id,
        status: initialStatus,
      });
    }`;

matchRoute = matchRoute.replace(notifTarget, notifReplacement);

fs.writeFileSync('src/app/api/matches/route.ts', matchRoute, 'utf8');
console.log('[OK] Updated src/app/api/matches/route.ts with sendNotification and realtime');
