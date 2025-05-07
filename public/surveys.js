document.addEventListener('DOMContentLoaded', async () => {
    const surveysList = document.getElementById('surveysList');
    
    try {
        // Fetch all available surveys
        const response = await fetch('/api/surveys');
        
        if (!response.ok) {
            throw new Error('Failed to load surveys');
        }
        
        const surveys = await response.json();
        
        if (surveys.length === 0) {
            surveysList.innerHTML = '<p class="no-surveys">No surveys available at the moment.</p>';
            return;
        }
        
        // Clear loading message
        surveysList.innerHTML = '';
        
        // Display each survey
        surveys.forEach(survey => {
            const surveyCard = document.createElement('div');
            surveyCard.className = 'survey-card';
            
            surveyCard.innerHTML = `
                <h3>${survey.title}</h3>
                <p>${survey.description || 'No description available.'}</p>
                <div class="survey-actions">
                    <a href="/survey.html?id=${survey._id}" class="btn">Take Survey</a>
                </div>
            `;
            
            surveysList.appendChild(surveyCard);
        });
    } catch (error) {
        console.error('Error loading surveys:', error);
        surveysList.innerHTML = `<p class="error">Error loading surveys: ${error.message}</p>`;
    }
}); 