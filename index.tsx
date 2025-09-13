import { GoogleGenAI, Type } from "@google/genai";

// DOM Element References
const searchInput = document.getElementById('searchInput') as HTMLTextAreaElement;
const searchButton = document.getElementById('searchButton') as HTMLButtonElement;
const buttonText = document.getElementById('buttonText') as HTMLSpanElement;
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const messageDiv = document.getElementById('message');

const jobResultsContainer = document.getElementById('jobResultsContainer');
const jobResults = document.getElementById('jobResults');
const achievementResultsContainer = document.getElementById('achievementResultsContainer');
const achievementResults = document.getElementById('achievementResults');
const contextualResultsContainer = document.getElementById('contextualResultsContainer');
const contextualJobResults = document.getElementById('contextualJobResults');

// Initialize the Google AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the expected JSON response structure for the AI model
const schema = {
  type: Type.OBJECT,
  properties: {
    recommendedJobs: {
      type: Type.ARRAY,
      description: 'The 10 most relevant job recommendations based on the user query.',
      items: { type: Type.STRING },
    },
    relatedAchievements: {
      type: Type.ARRAY,
      description: '3 related school achievement standards to broaden career exploration.',
      items: { type: Type.STRING },
    },
    contextualJobs: {
      type: Type.ARRAY,
      description: '5 additional job recommendations from related fields or contexts.',
      items: { type: Type.STRING },
    },
  },
  required: ['recommendedJobs', 'relatedAchievements', 'contextualJobs'],
};

/**
 * Creates a styled tag element for displaying a result item.
 * @param text - The text content of the tag.
 * @returns A styled HTMLDivElement.
 */
const createTag = (text: string): HTMLDivElement => {
    const tag = document.createElement('div');
    tag.className = 'result-tag';
    tag.textContent = text;
    return tag;
};

/**
 * Clears all previous results and messages from the UI.
 */
const clearResults = () => {
    jobResults.innerHTML = '';
    achievementResults.innerHTML = '';
    contextualJobResults.innerHTML = '';
    messageDiv.innerHTML = '';
    
    jobResultsContainer.classList.add('hidden');
    achievementResultsContainer.classList.add('hidden');
    contextualResultsContainer.classList.add('hidden');
    messageDiv.classList.add('hidden');
};

/**
 * Populates a container with tags from a list of strings.
 * @param container - The HTML element to append tags to.
 * @param items - An array of strings to be displayed as tags.
 */
const populateTags = (container: HTMLElement, items: string[]) => {
    if (items && items.length > 0) {
        items.forEach(item => {
            container.appendChild(createTag(item));
        });
        container.parentElement.classList.remove('hidden');
    }
};

/**
 * Displays a message in the message area.
 * @param text - The message to display.
 */
const showMessage = (text: string) => {
    messageDiv.textContent = text;
    messageDiv.classList.remove('hidden');
};

/**
 * Main function to perform the search by calling the Gemini API.
 */
const performSearch = async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    // --- Set UI to loading state ---
    searchButton.disabled = true;
    buttonText.textContent = 'AI가 분석 중...';
    resultsDiv.classList.remove('hidden');
    loadingDiv.classList.remove('hidden');
    resultsDiv.setAttribute('aria-busy', 'true');
    clearResults();

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `한국 중학생을 위한 진로 상담 요청입니다. 다음 내용과 관련된 직업을 추천해주세요: "${query}"`,
            config: {
                systemInstruction: "당신은 한국 중학생들을 위한 친절한 진로 상담 AI입니다. 주어진 성취기준이나 관심 키워드를 바탕으로 진로 탐색에 도움을 주세요. 응답은 반드시 제공된 JSON 스키마를 따라야 합니다.",
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const resultData = JSON.parse(response.text);
        
        // --- Populate UI with results ---
        populateTags(jobResults, resultData.recommendedJobs);
        populateTags(achievementResults, resultData.relatedAchievements);
        populateTags(contextualJobResults, resultData.contextualJobs);

        const hasResults = 
            (resultData.recommendedJobs && resultData.recommendedJobs.length > 0) ||
            (resultData.contextualJobs && resultData.contextualJobs.length > 0);

        if (!hasResults) {
            showMessage('입력하신 내용과 관련된 직업을 찾지 못했어요. 다른 키워드로 다시 시도해 보세요!');
        }

    } catch (error) {
        console.error("Gemini API call failed:", error);
        showMessage('죄송합니다. AI와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
        // --- Reset UI from loading state ---
        searchButton.disabled = false;
        buttonText.textContent = '관련 직업 찾기';
        loadingDiv.classList.add('hidden');
        resultsDiv.removeAttribute('aria-busy');
    }
};


// --- Event Listeners ---
searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        performSearch();
    }
});
