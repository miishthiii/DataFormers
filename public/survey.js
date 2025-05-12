document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const surveyId = urlParams.get('id');
    const shareableLink = urlParams.get('link');

    if (!surveyId && !shareableLink) {
        alert('Survey ID or link not provided');
        return;
    }

    try {
        // Determine which identifier to use
        const identifier = surveyId || shareableLink;
        const endpoint = surveyId ? `/api/surveys/${identifier}` : `/api/surveys/link/${identifier}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error('Survey not found');
        }
        const survey = await response.json();

        document.getElementById('surveyTitle').textContent = survey.title;
        document.getElementById('surveyDescription').textContent = survey.description || '';

        const questionsContainer = document.getElementById('questionsContainer');
        survey.questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';
            let inputHtml = '';
            
            switch(question.questionType) {
                case 'text':
                    inputHtml = `<input type="text" name="q${index}" required>`;
                    break;
                case 'single':
                    inputHtml = question.options.map((option, optIndex) => `
                        <div class="option">
                            <input type="radio" 
                                   name="q${index}" 
                                   value="${option}"
                                   required>
                            <label>${option}</label>
                        </div>
                    `).join('');
                    break;
                case 'multiple':
                    inputHtml = question.options.map((option, optIndex) => `
                        <div class="option">
                            <input type="checkbox" 
                                   name="q${index}" 
                                   value="${option}">
                            <label>${option}</label>
                        </div>
                    `).join('');
                    break;
            }
            
            questionDiv.innerHTML = `
                <label>${question.questionText}</label>
                ${inputHtml}
            `;
            questionsContainer.appendChild(questionDiv);
        });

        document.getElementById('surveyResponseForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get the actual survey ID if we're using a shareable link
            const actualSurveyId = surveyId || survey._id;
            
            // Collect form data
            const formData = new FormData(e.target);
            const responses = {};
            
            // Process form data
            for (let [name, value] of formData.entries()) {
                const questionIndex = name.replace('q', '');
                if (!responses[questionIndex]) {
                    responses[questionIndex] = [];
                }
                if (Array.isArray(responses[questionIndex])) {
                    responses[questionIndex].push(value);
                } else {
                    responses[questionIndex] = [responses[questionIndex], value];
                }
            }

            try {
                console.log('Submitting responses:', responses);
                
                const submitResponse = await fetch(`/api/surveys/${actualSurveyId}/responses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ responses })
                });

                if (!submitResponse.ok) {
                    const errorData = await submitResponse.json();
                    throw new Error(errorData.error || 'Failed to submit response');
                }

                const result = await submitResponse.json();
                console.log('Response submitted successfully:', result);
                
                alert('Thank you for your response!');
                window.location.href = '/';
            } catch (error) {
                console.error('Error submitting response:', error);
                alert('Error submitting response: ' + error.message);
            }
        });
    } catch (error) {
        console.error('Error loading survey:', error);
        alert('Error loading survey: ' + error.message);
    }
});