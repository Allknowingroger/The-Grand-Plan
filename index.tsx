/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Handles clicks on the "Explore Frontier" (Learn More) buttons.
 */
async function handleExploreClick(event: MouseEvent): Promise<void> {
  const button = event.currentTarget as HTMLButtonElement;
  const section = button.closest<HTMLElement>('.plan-section');
  if (!section) return;

  const detailsContainer = section.querySelector('.details-container') as HTMLElement;
  if (!detailsContainer) return;

  const isExpanded = section.classList.toggle('expanded');
  button.setAttribute('aria-expanded', String(isExpanded));

  if (isExpanded) {
    button.textContent = 'Seal Frontier';
    const isLoaded = section.dataset.content === 'loaded';

    if (!isLoaded) {
      detailsContainer.innerHTML = '<div class="message assistant">Initializing deep dive...</div>';
      button.disabled = true;

      try {
        const title = (section.querySelector('h2') as HTMLElement).textContent || '';
        const description = (section.querySelector('p') as HTMLElement).textContent || '';
        const prompt = `Act as a futuristic historian and philosopher. Expand on the concept of "${title}". 
        Original summary: ${description}. 
        Provide a deeper visionary perspective in 2 concise paragraphs. 
        Focus on the technological breakthroughs and the positive evolution of the human spirit in this bright future.`;

        const responseStream = await ai.models.generateContentStream({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });

        detailsContainer.innerHTML = '';
        const contentP = document.createElement('p');
        contentP.classList.add('streaming');
        detailsContainer.appendChild(contentP);

        for await (const chunk of responseStream) {
          contentP.textContent += chunk.text;
        }
        
        contentP.classList.remove('streaming');
        section.dataset.content = 'loaded';
      } catch (error) {
        console.error('Error:', error);
        detailsContainer.innerHTML = '<p style="color: #ef4444;">Error accessing the data stream. Connection disrupted.</p>';
      } finally {
        button.disabled = false;
      }
    }
  } else {
    button.textContent = 'Explore Frontier';
  }
}

/**
 * Generates high-quality icons using the image generation model.
 */
async function generateIcons(): Promise<void> {
  const placeholders = document.querySelectorAll<HTMLElement>('.icon-placeholder');
  
  for (const placeholder of placeholders) {
    const phaseName = placeholder.dataset.phase || 'Future technology';
    
    try {
      const prompt = `A highly detailed, clean, minimalist futuristic icon for "${phaseName}". 
      Style: vibrant colors, soft gradients on a pure white background, modern glassmorphism aesthetic, 
      high-tech symbolic representation. High-key lighting, professional 3D render style with soft shadows.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: { aspectRatio: "1:1" }
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const img = document.createElement('img');
          img.src = `data:image/png;base64,${part.inlineData.data}`;
          img.alt = phaseName;
          placeholder.innerHTML = '';
          placeholder.appendChild(img);
          break;
        }
      }
    } catch (error) {
      console.error('Icon generation failed:', error);
      placeholder.innerHTML = '✨';
      placeholder.style.fontSize = '24px';
      placeholder.style.color = '#3b82f6';
    }
  }
}

/**
 * Generates the "Grand Vision" poetic statement.
 */
async function generateGrandVision(): Promise<void> {
  const visionText = document.getElementById('vision-text');
  const btn = document.getElementById('generate-vision-btn') as HTMLButtonElement;
  if (!visionText || !btn) return;

  btn.disabled = true;
  visionText.classList.remove('placeholder-text');
  visionText.textContent = '';
  visionText.classList.add('streaming');

  const sections = Array.from(document.querySelectorAll('.plan-section h2'))
    .map(h2 => h2.textContent)
    .join(', ');

  try {
    const prompt = `Synthesize these 10 phases of a grand human plan into a single, extremely powerful and uplifting visionary statement of roughly 3-4 sentences. 
    Phases: ${sections}. 
    Make it feel optimistic, clear, and inspiring. Avoid dark or dystopian themes.`;

    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    for await (const chunk of stream) {
      visionText.textContent += chunk.text;
    }
  } catch (error) {
    visionText.textContent = "The vision is momentarily obscured. Please reconnect to the collective consciousness.";
  } finally {
    visionText.classList.remove('streaming');
    btn.style.display = 'none';
  }
}

/**
 * Chat Logic
 */
let chat: any = null;

async function initChat() {
  const form = document.getElementById('chat-form') as HTMLFormElement;
  const input = document.getElementById('chat-input') as HTMLInputElement;
  const container = document.getElementById('chat-messages') as HTMLElement;
  const toggle = document.getElementById('chat-toggle') as HTMLButtonElement;
  const widget = document.getElementById('ai-chat-widget') as HTMLElement;

  toggle.addEventListener('click', () => {
    widget.classList.toggle('collapsed');
    toggle.textContent = widget.classList.contains('collapsed') ? '↑' : '↓';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    // User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    userDiv.textContent = message;
    container.appendChild(userDiv);
    input.value = '';
    container.scrollTop = container.scrollHeight;

    // Assistant Message Placeholder
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant streaming';
    container.appendChild(assistantDiv);

    try {
      if (!chat) {
        chat = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: {
            systemInstruction: "You are the 'Oracle of the Future', an uplifting AI guide for 'The Grand Plan'. Your outlook is bright, clear, and grounded in human flourishing. You are wise, encouraging, and helpful. Keep answers concise but deeply inspiring."
          }
        });
      }

      const responseStream = await chat.sendMessageStream({ message });
      assistantDiv.textContent = '';
      
      for await (const chunk of responseStream) {
        assistantDiv.textContent += chunk.text;
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {
      assistantDiv.textContent = "Apologies, the data link is unstable. Let us try once more.";
    } finally {
      assistantDiv.classList.remove('streaming');
    }
  });
}

function initialize(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('.learn-more-btn');
  buttons.forEach(button => button.addEventListener('click', handleExploreClick));

  const visionBtn = document.getElementById('generate-vision-btn');
  visionBtn?.addEventListener('click', generateGrandVision);

  generateIcons();
  initChat();
}

document.addEventListener('DOMContentLoaded', initialize);
