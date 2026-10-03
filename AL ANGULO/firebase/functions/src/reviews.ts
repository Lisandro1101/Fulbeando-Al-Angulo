import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * TRIGGER DE REPUTACIÓN B2B Y FAIR PLAY (Costo Cero N+1)
 * Cuando se inyecta una reseña validada por las Security Rules en la colección `reviews`,
 * esta Cloud Function reacciona y suma los acumuladores matemáticos de manera atómica.
 */
export const onReviewCreated = functions.firestore
  .document('reviews/{reviewId}')
  .onCreate(async (snapshot, context) => {
    const review = snapshot.data();
    
    const targetId = review.targetId;
    const targetType = review.targetType; // 'VENUE' | 'TEAM'
    const overallScore = review.scores.overall;

    const batch = db.batch();

    // ==============================================================
    // ESCENARIO A: Equipos calificando a un Complejo Deportivo
    // ==============================================================
    if (targetType === 'VENUE') {
      const venueRef = db.collection('venues').doc(targetId);
      
      // Actualizamos los acumuladores absolutos (El cliente calculará Promedio = Sum / Count)
      batch.update(venueRef, {
        'reputation.ratingCount': admin.firestore.FieldValue.increment(1),
        'reputation.ratingSum': admin.firestore.FieldValue.increment(overallScore)
      });
    } 
    // ==============================================================
    // ESCENARIO B: Complejo B2B calificando a un Equipo (Fair Play)
    // ==============================================================
    else if (targetType === 'TEAM') {
      const teamRef = db.collection('teams').doc(targetId);
      
      const punctualityScore = review.scores.punctuality || 0;
      const fairPlayScore = review.scores.fairPlay || 0;
      
      batch.update(teamRef, {
        'reputation.reviewsCount': admin.firestore.FieldValue.increment(1),
        'reputation.reputationScore': admin.firestore.FieldValue.increment(overallScore),
        'reputation.punctualitySum': admin.firestore.FieldValue.increment(punctualityScore),
        'reputation.fairPlaySum': admin.firestore.FieldValue.increment(fairPlayScore),
      });
    }

    try {
      // COMMIT ATÓMICO: Sin riesgo de sobrescribir promedios calculados concurrentemente
      await batch.commit();
      console.log(`[Al Ángulo] Reseña ${context.params.reviewId} inyectada. Acumuladores de ${targetType} actualizados.`);
    } catch (error) {
      console.error(`[Al Ángulo] Error crítico actualizando acumuladores en reseña ${context.params.reviewId}:`, error);
    }
    
    return null;
  });
