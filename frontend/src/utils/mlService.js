// frontend/src/utils/mlService.js
const API_BASE = import.meta.env.VITE_DRUG_INTERACTION_API || 'http://localhost:3000/api';
const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';

export const mlService = {
    // Check drug interactions
    async checkInteractions(drugs, options = {}) {
        try {
        const response = await fetch(`${API_BASE}/drug-interactions/check`, {
            method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              drugs,
              includeFood: options.includeFood || false,
              patientAge: options.patientAge,
              conditions: options.conditions || []
          }),
      });

        const data = await response.json();

        // 🎯 ENHANCEMENT: Add model source indicator
        if (data.data) {
            data.data.model = 'ml_model';  // Now using real ML model
            data.data.timestamp = new Date().toISOString();

            // Add confidence indicators
            data.data.interactions?.forEach(interaction => {
                interaction.prediction.confidence =
                    interaction.prediction.probability > 0.8 ? 'high' :
                        interaction.prediction.probability > 0.5 ? 'medium' : 'low';

                // Color coding based on source
                interaction.prediction.source = interaction.prediction.source || 'ml_model';
                interaction.prediction.sourceColor =
                    interaction.prediction.source === 'database' ? 'bg-green-100 text-green-800' :
                        interaction.prediction.source === 'ml_model' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800';
            });
        }

        return data;

    } catch (error) {
            console.error('Error checking interactions:', error);

            // Fallback to direct ML service call
            return this._fallbackToDirectML(drugs, options);
        }
    },

    // Direct ML service call (fallback)
    async _fallbackToDirectML(drugs, options) {
        try {
        const response = await fetch(`${ML_SERVICE_URL}/predict/interactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              drugs,
              include_food: options.includeFood || false
          }),
      });

        const data = await response.json();

        // Transform to frontend format
        return {
            success: true,
            data: {
                requestId: data.request_id,
                timestamp: new Date().toISOString(),
                drugCount: drugs.length,
                interactions: data.interactions?.map(i => ({
                    drugs: i.drug_pair,
                    prediction: {
                        hasInteraction: i.prediction?.interaction || false,
                        probability: i.prediction?.probability || 0,
                        severity: i.prediction?.severity || 'unknown',
                        description: i.prediction?.description || '',
                        confidence: i.prediction?.confidence || 'medium',
                        source: i.prediction?.source || 'ml_direct',
                        sourceColor: 'bg-purple-100 text-purple-800'
                    }
                })) || [],
                summary: data.summary || {},
                model: 'ml_direct_fallback'
            }
      };

    } catch (error) {
            console.error('Direct ML service also failed:', error);
            return this._generateMockResponse(drugs);
        }
    },

    // Risk assessment
    async assessRisk(drugs, patientAge, conditions) {
        try {
        const response = await fetch(`${API_BASE}/drug-interactions/risk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drugs, patientAge, conditions }),
      });
        return await response.json();
    } catch (error) {
            console.error('Risk assessment failed:', error);
            return this._generateMockRisk(drugs, patientAge, conditions);
        }
    },

    // Health check
    async healthCheck() {
        try {
        const response = await fetch(`${ML_SERVICE_URL}/health`);
        return await response.json();
    } catch (error) {
            return { status: 'unreachable', error: error.message };
        }
    },

    // Mock responses (keep for emergencies)
    _generateMockResponse(drugs) {
        console.warn('Using mock response');
        const interactions = [];

        for (let i = 0; i < drugs.length; i++) {
            for (let j = i + 1; j < drugs.length; j++) {
                const hasInteraction = Math.random() > 0.6;
                interactions.push({
                    drugs: [drugs[i], drugs[j]],
                    prediction: {
                        hasInteraction,
                        probability: hasInteraction ? Math.random() * 0.4 + 0.6 : Math.random() * 0.3,
                        severity: hasInteraction ? (Math.random() > 0.5 ? 'high' : 'medium') : 'low',
                        description: hasInteraction
                            ? `Potential interaction detected (MOCK)`
                            : `No interaction expected (MOCK)`,
                        confidence: 'mock',
                        source: 'mock_data',
                        sourceColor: 'bg-yellow-100 text-yellow-800'
                    }
                });
            }
        }

        return {
            success: true,
            data: {
                requestId: `mock_${Date.now()}`,
                timestamp: new Date().toISOString(),
                drugCount: drugs.length,
                interactions,
                summary: {
                    totalPairs: interactions.length,
                    interactingPairs: interactions.filter(i => i.prediction.hasInteraction).length,
                    highRiskPairs: interactions.filter(i => i.prediction.severity === 'high').length
                },
                model: 'mock_fallback'
            }
        };
    },

    _generateMockRisk(drugs, patientAge, conditions) {
    // ... existing mock code ...
  }
};

export default mlService;