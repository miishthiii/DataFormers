document.addEventListener('DOMContentLoaded', async () => {
    const surveySelect = document.getElementById('surveySelect');
    const responsesContainer = document.getElementById('responsesContainer');
    
    // Load all surveys
    try {
        const response = await fetch('/api/surveys');
        if (!response.ok) {
            throw new Error('Failed to load surveys');
        }
        
        const surveys = await response.json();
        
        if (surveys.length === 0) {
            surveySelect.innerHTML = '<option value="">No surveys available</option>';
            return;
        }
        
        // Add surveys to dropdown
        surveys.forEach(survey => {
            const option = document.createElement('option');
            option.value = survey._id;
            option.textContent = survey.title;
            surveySelect.appendChild(option);
        });
        
        // Add event listener for survey selection
        surveySelect.addEventListener('change', async () => {
            const surveyId = surveySelect.value;
            
            if (!surveyId) {
                responsesContainer.innerHTML = '<p class="no-responses">Select a survey to view responses.</p>';
                return;
            }
            
            try {
                // Load survey details
                const surveyResponse = await fetch(`/api/surveys/${surveyId}`);
                if (!surveyResponse.ok) {
                    throw new Error('Failed to load survey details');
                }
                
                const survey = await surveyResponse.json();
                
                // Load responses for this survey
                const responsesResponse = await fetch(`/api/surveys/${surveyId}/responses`);
                if (!responsesResponse.ok) {
                    throw new Error('Failed to load responses');
                }
                
                const responses = await responsesResponse.json();
                
                if (responses.length === 0) {
                    responsesContainer.innerHTML = '<p class="no-responses">No responses yet for this survey.</p>';
                    return;
                }
                
                // Display responses
                let html = `<h2>Responses for "${survey.title}"</h2>`;
                html += `<p>Total responses: ${responses.length}</p>`;
                
                responses.forEach((response, index) => {
                    html += `<div class="response-card">`;
                    html += `<h3>Response #${index + 1}</h3>`;
                    html += `<p class="response-date">Submitted: ${new Date(response.submittedAt).toLocaleString()}</p>`;
                    
                    // Display each answer
                    html += `<div class="response-answers">`;
                    for (const [questionIndex, answer] of Object.entries(response.responses)) {
                        const question = survey.questions[questionIndex];
                        if (question) {
                            html += `<div class="answer">`;
                            html += `<p class="question-text"><strong>${question.questionText}</strong></p>`;
                            html += `<p class="answer-text">${Array.isArray(answer) ? answer.join(', ') : answer}</p>`;
                            html += `</div>`;
                        }
                    }
                    html += `</div>`;
                    html += `</div>`;
                });
                
                responsesContainer.innerHTML = html;
            } catch (error) {
                console.error('Error loading responses:', error);
                responsesContainer.innerHTML = `<p class="error">Error loading responses: ${error.message}</p>`;
            }
        });
    } catch (error) {
        console.error('Error loading surveys:', error);
        surveySelect.innerHTML = '<option value="">Error loading surveys</option>';
    }
}); 