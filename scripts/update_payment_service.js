const fs = require('fs');

let paymentService = fs.readFileSync('src/services/payment-service.ts', 'utf8');

// Add imports
if (!paymentService.includes("import { sendNotification } from './notification-service';")) {
  paymentService = `import { sendNotification } from './notification-service';
import { publishEvent, publishUserEvent } from '@/lib/realtime';
` + paymentService;
}

// In submitPaymentProof, add notification & event
const submitHookTarget = `  await createAuditLog({
    userId: payment.userId,
    action: 'PAYMENT_PROOF_SUBMITTED',
    entityType: 'Payment',
    entityId: payment.id,
    changes: {
      method: params.paymentMethod,
      ref: params.transactionReference,
    },
  });

  return updatedPayment;`;

const submitHookReplacement = `  await createAuditLog({
    userId: payment.userId,
    action: 'PAYMENT_PROOF_SUBMITTED',
    entityType: 'Payment',
    entityId: payment.id,
    changes: {
      method: params.paymentMethod,
      ref: params.transactionReference,
    },
  });

  // Real-Time Notification & Event
  await sendNotification({
    userId: payment.userId,
    title: 'Payment Proof Submitted 💳',
    message: \`Your payment proof (Ref: \${params.transactionReference}) for \${payment.paymentType} has been submitted for verification.\`,
    notificationType: 'PAYMENT_SUBMITTED',
    type: 'INFO',
    linkUrl: '/dashboard/payments',
  });

  publishEvent('payments', 'PAYMENT_UPDATE', {
    paymentId: payment.id,
    status: 'SUBMITTED',
    reference: params.transactionReference,
  });

  return updatedPayment;`;

paymentService = paymentService.replace(submitHookTarget, submitHookReplacement);

// In verifyPayment, replace prisma.notification.create with sendNotification and publish event
const verifyNotifTarget = `  // Notify user
  await prisma.notification.create({
    data: {
      userId: payment.userId,
      title: isApproved ? 'Payment Verified' : 'Payment Rejected',
      message: isApproved
        ? \`Your payment of PKR \${payment.amount} for \${payment.paymentType} has been verified.\`
        : \`Your payment was rejected: \${params.rejectionReason || 'Invalid proof'}.\`,
      type: isApproved ? 'SUCCESS' : 'WARNING',
    },
  });`;

const verifyNotifReplacement = `  // Notify user
  await sendNotification({
    userId: payment.userId,
    title: isApproved ? 'Payment Verified ✅' : 'Payment Rejected ❌',
    message: isApproved
      ? \`Your payment of PKR \${payment.amount} for \${payment.paymentType} has been successfully verified.\`
      : \`Your payment of PKR \${payment.amount} was rejected: \${params.rejectionReason || 'Invalid transaction receipt'}.\`,
    notificationType: isApproved ? 'PAYMENT_VERIFIED' : 'PAYMENT_SUBMITTED',
    type: isApproved ? 'SUCCESS' : 'WARNING',
    linkUrl: '/dashboard/payments',
  });

  publishEvent('payments', 'PAYMENT_UPDATE', {
    paymentId: payment.id,
    status: isApproved ? 'VERIFIED' : 'REJECTED',
  });`;

paymentService = paymentService.replace(verifyNotifTarget, verifyNotifReplacement);

// In createTransferRequest, add TRANSFER_REQUEST notifications to captains
const transferReqTarget = `  return { transfer, payment };`;
const transferReqReplacement = `  // Notify destination captain
  const destTeamWithCap = await prisma.team.findUnique({ where: { id: params.newTeamId }, select: { captainId: true, name: true } });
  if (destTeamWithCap?.captainId) {
    await sendNotification({
      userId: destTeamWithCap.captainId,
      title: 'New Player Transfer Request 📋',
      message: \`A player has initiated a transfer request to join \${destTeamWithCap.name}.\`,
      notificationType: 'TRANSFER_REQUEST',
      type: 'INFO',
      linkUrl: '/captain',
    });
  }

  return { transfer, payment };`;

paymentService = paymentService.replace(transferReqTarget, transferReqReplacement);

fs.writeFileSync('src/services/payment-service.ts', paymentService, 'utf8');
console.log('[OK] Updated src/services/payment-service.ts with realtime and notification dispatches');
