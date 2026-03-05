const chat = document.getElementById("chat");
const form = document.getElementById("chat-form");
const input = document.getElementById("message");
const apiKeyInput = document.getElementById("apiKey");
const lightModeSwitch = document.getElementById("lightModeSwitch");
const offlineSwitch = document.getElementById("offlineSwitch");
const historyList = document.getElementById("historyList");
const newChatBtn = document.getElementById("newChat");
const clearChatBtn = document.getElementById("clearChat");

const fileInput = document.getElementById("fileInput");
const attachButton = document.getElementById("attachButton");
const filePreviewContainer = document.getElementById("file-preview");

let currentChatId = localStorage.getItem("currentChatId") || createNewChatId();

window.addEventListener("load", () => {
  //Restore saved API key (if any)
  const savedKey = localStorage.getItem("openai_api_key");
  if (savedKey) apiKeyInput.value = savedKey;

  //Restore saved chat & sidebar history
  loadChatFromLocalStorage();
  loadHistoryList();

  //Restore Light Mode
  const light = localStorage.getItem("lightMode") === "true";
  document.body.classList.toggle("light", light);
  document.getElementById("sidebar").classList.toggle("light", light);
  lightModeSwitch.checked = light;

  //Restore Offline Mode
  const offline = localStorage.getItem("offlineMode") === "true";
  offlineSwitch.checked = offline;
  toggleOfflineUI(offline);
});


//SAVE and TOGGLE HANDLERS FOR API KEY, LIGHT and OFFLINE MODES :D

apiKeyInput.addEventListener("input", () => {
  localStorage.setItem("openai_api_key", apiKeyInput.value.trim());
});

lightModeSwitch.addEventListener("change", () => {
  const enabled = lightModeSwitch.checked;
  document.body.classList.toggle("light", enabled);
  document.getElementById("sidebar").classList.toggle("light", enabled);
  localStorage.setItem("lightMode", enabled);
});

offlineSwitch.addEventListener("change", () => {
  const enabled = offlineSwitch.checked;
  toggleOfflineUI(enabled);
  localStorage.setItem("offlineMode", enabled);
});

function toggleOfflineUI(enabled) {
  if (enabled) {
    apiKeyInput.disabled = true;
    apiKeyInput.placeholder = "Offline mode (no key needed)";
  } else {
    apiKeyInput.disabled = false;
    apiKeyInput.placeholder = "sk-… (optional)";
  }
}

// MY CHAT SESSION & HISTORY with NicaAI MANAGEMENT :)
function createNewChatId() {
  const id = "chat_" + Date.now();
  localStorage.setItem("currentChatId", id);
  return id;
}

function saveChatToLocalStorage() {
  localStorage.setItem(currentChatId, chat.innerHTML);
  loadHistoryList();
}

function loadChatFromLocalStorage() {
  const saved = localStorage.getItem(currentChatId);
  chat.innerHTML = saved || "";
}

function loadHistoryList() {
  historyList.innerHTML = "";
  Object.keys(localStorage)
    .filter(key => key.startsWith("chat_"))
    .sort((a, b) => b.localeCompare(a))
    .forEach(id => {
      const btn = document.createElement("button");
      btn.textContent = new Date(Number(id.split("_")[1])).toLocaleString();
      btn.className = "history-button";
      btn.onclick = () => {
        currentChatId = id;
        localStorage.setItem("currentChatId", id);
        loadChatFromLocalStorage();
      };
      historyList.appendChild(btn);
    });
}

newChatBtn.addEventListener("click", () => {
  currentChatId = createNewChatId();
  chat.innerHTML = "";
  loadHistoryList();
});

clearChatBtn.addEventListener("click", () => {
  chat.innerHTML = "";
  localStorage.removeItem(currentChatId);
  loadHistoryList();
});


//MESSAGE RENDERING PROCESSING

function createMessageElement(role, htmlContent) {
  const message = document.createElement("div");
  message.className = "message " + role;

  const avatar = document.createElement("div");
  avatar.className = "avatar-block";
  const img = document.createElement("img");
  img.className = "avatar";
  img.src = role === "user" ? "user.png" : "ai.png";
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = role === "user" ? "You" : "nicAi";
  avatar.appendChild(img);
  avatar.appendChild(name);

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = htmlContent;

  message.appendChild(avatar);
  message.appendChild(bubble);
  return message;
}

function addMessage(role, htmlContent) {
  const messageEl = createMessageElement(role, htmlContent);
  chat.appendChild(messageEl);
  chat.scrollTop = chat.scrollHeight;
  saveChatToLocalStorage();
}

function addLoadingMessage() {
  const loadingEl = createMessageElement("ai", "Typing…");
  loadingEl.classList.add("loading");
  chat.appendChild(loadingEl);
  chat.scrollTop = chat.scrollHeight;
  return loadingEl;
}


//FILE ATTACHMENT AND PREVIEW HANDLING
attachButton.addEventListener("click", () => {
  fileInput.click();
});

// When a file is selected, show a thumbnail/video + “Remove Attachment” button
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) {
    hidePreview();
    return;
  }
//clear previous preview
  const url = URL.createObjectURL(file);
  filePreviewContainer.innerHTML = "";      
  filePreviewContainer.style.display = "block";

  //types of file waht to preview
  let previewEl;
  if (file.type.startsWith("image/")) {
    previewEl = document.createElement("img");
    previewEl.src = url;
  } else if (file.type.startsWith("video/")) {
    previewEl = document.createElement("video");
    previewEl.src = url;
    previewEl.controls = true;
  } else {
    const span = document.createElement("span");
    span.textContent = file.name;
    previewEl = span;
  }

  previewEl.style.maxWidth = "100%";
  previewEl.style.borderRadius = "8px";
  filePreviewContainer.appendChild(previewEl);

  //Remove Attachment
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-attachment";
  removeBtn.textContent = "Remove Attachment";
  removeBtn.onclick = () => {
    fileInput.value = "";
    hidePreview();
  };
  filePreviewContainer.appendChild(removeBtn);
});

function hidePreview() {
  filePreviewContainer.innerHTML = "";
  filePreviewContainer.style.display = "none";
}

//convert Base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


//OVERALL LOVE FORM SUBMISSION TO MY NICAI XD
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userText = input.value.trim();
  const apiKey = apiKeyInput.value.trim();
  const file = fileInput.files[0];

  //Offline mode fallback API key requirements
  if (!offlineSwitch.checked && !apiKey) {
    alert("Please enter your API key or enable Offline Mode.");
    return;
  }


  if (!userText && !file) return;

  if (userText) {
    addMessage("user", escapeHtml(userText));
  }

  let fileBase64 = null;
  if (file) {
    fileBase64 = await toBase64(file);

    let mediaHtml;
    if (file.type.startsWith("image/")) {
      mediaHtml = `<img src="${fileBase64}" style="max-width:200px; border-radius:8px;" />`;
    } else if (file.type.startsWith("video/")) {
      mediaHtml = `<video src="${fileBase64}" controls style="max-width:200px; border-radius:8px;"></video>`;
    } else {
      mediaHtml = `<p style="font-style:italic;">Unsupported file type: ${file.name}</p>`;
    }
    addMessage("user", mediaHtml);

   
    fileInput.value = "";
    hidePreview();
  }

  input.value = "";
  const loadingMsg = addLoadingMessage();
  try {
    if (offlineSwitch.checked) {
      const localApiUrl = "http://127.0.0.1:1234";
      const contentArray = [];
      if (userText) {
        contentArray.push({ type: "text", text: userText });
      }
      if (fileBase64) {
        contentArray.push({
          type: "image_url",
          image_url: { url: fileBase64 }
        });
      }

      const payload = {
        model: "gemma-3-1b",
        messages: [
          {
            role: "user",
            content: contentArray
          }
        ]
      };

      const res = await fetch(`${localApiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      chat.removeChild(loadingMsg);

      let rawReply = data.choices?.[0]?.message?.content || "No response.";
      if (rawReply.includes("</think>")) {
        const parts = rawReply.split("</think>");
        rawReply = parts[parts.length - 1].trim();
      }
      addMessage("ai", escapeHtml(rawReply));

    } else {
      //OpenAI API its in there website just copypaste it
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: userText
            }
          ]
        })
      });
      const data = await res.json();
      chat.removeChild(loadingMsg);

      
      let rawReply = data.choices?.[0]?.message?.content || "No response.";
      if (rawReply.includes("</think>")) {
        const parts = rawReply.split("</think>");
        rawReply = parts[parts.length - 1].trim();
      }
      addMessage("ai", escapeHtml(rawReply));
    }
  } catch (err) {
    chat.removeChild(loadingMsg);
    addMessage("ai", "⚠️ Failed to fetch response.");
    console.error(err);
  }
});

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
