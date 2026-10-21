const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5:3b";
const taskInput = document.getElementById("taskInput");
const energySelect = document.getElementById("energySelect");
const timeSelect = document.getElementById("timeSelect");
const makePlanBtn = document.getElementById("makePlanBtn");
const statusEl = document.getElementById("status");
const emptyState = document.getElementById("emptyState");
const planResult = document.getElementById("planResult");
const charCount = document.getElementById("charCount");
const historyList = document.getElementById("historyList");
let latestPlan = null;

taskInput.addEventListener("input", () => {
  charCount.textContent = `${taskInput.value.length} / 1200`;
});

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

async function checkConnection() {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if (!response.ok) throw new Error("Ollama did not respond");
    const data = await response.json();
    const models = (data.models || []).map(m => m.name);
    const found = models.some(name => name === MODEL || name.startsWith(MODEL.split(":")[0] + ":"));
    if (found) setStatus(`Connected to local Ollama. Model available: ${MODEL}.`, "ok");
    else setStatus(`Ollama is running, but ${MODEL} is not installed yet. Run: ollama pull ${MODEL}`, "error");
  } catch {
    setStatus("Local AI not connected yet. Install and start Ollama, then run: ollama pull " + MODEL, "error");
  }
}

function buildPrompt(task, energy, minutes) {
  const energyText = {
    low: "very low energy; suggest the smallest possible actions and avoid pressure",
    medium: "moderate energy; suggest manageable actions",
    high: "good energy; suggest focused but realistic actions"
  }[energy];
  return `You are SlowMate, a kind but practical low-pressure productivity assistant. Help the user make progress with less effort.
User's task dump: ${task}
Energy: ${energyText}
Available time: ${minutes} minutes.

Return ONLY valid JSON, no markdown fences, using exactly this structure:
{
 "headline": "short encouraging headline",
 "reframe": "one supportive sentence without guilt or toxic positivity",
 "steps": [
   {"title":"action that starts with a verb","detail":"one concrete instruction, 1-2 sentences","minutes":3}
 ],
 "tiny_win": "the smallest useful action they can do in under two minutes",
 "permission": "a sentence that gives permission to stop after a small win"
}
Rules: create 3 to 5 steps; total estimated minutes must fit the available time; each step must be specific and easy to start; do not invent deadlines or facts; avoid generic advice; keep the tone warm, concise, and slightly playful.`;
}

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("The model returned an unexpected format. Try again.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function generatePlan() {
  const task = taskInput.value.trim();
  if (!task) {
    setStatus("Add a task or brain dump first — messy notes are fine.", "error");
    taskInput.focus();
    return;
  }
  makePlanBtn.disabled = true;
  makePlanBtn.querySelector("span:first-child").textContent = "Making room to breathe…";
  setStatus(`Asking ${MODEL} on your computer to make a plan…`);
  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: buildPrompt(task, energySelect.value, Number(timeSelect.value)),
        stream: false,
        format: "json",
        options: { temperature: 0.55 }
      })
    });
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}. Is the model running?`);
    const data = await response.json();
    const plan = extractJson(data.response || "");
    if (!Array.isArray(plan.steps) || !plan.steps.length) throw new Error("The model did not return usable steps. Try again.");
    latestPlan = { task, plan, createdAt: new Date().toISOString() };
    renderPlan(latestPlan);
    saveHistory(latestPlan);
    setStatus("Your plan is ready. It's okay to do just one thing.", "ok");
  } catch (error) {
    const msg = error.message.includes("Failed to fetch")
      ? "Couldn't reach Ollama. Check that Ollama is running and browser access is allowed. See README for setup."
      : error.message;
    setStatus(msg, "error");
  } finally {
    makePlanBtn.disabled = false;
    makePlanBtn.querySelector("span:first-child").textContent = "Make this feel easier";
  }
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function renderPlan(item) {
  const { plan } = item;
  emptyState.classList.add("hidden");
  planResult.classList.remove("hidden");
  planResult.innerHTML = `
    <p class="plan-intro">${safeText(plan.reframe || "Let's make this manageable.")}</p>
    <div class="plan-label">Your tiny steps</div>
    ${(plan.steps || []).map((step, index) => `
      <div class="step-card" data-step="${index}">
        <button class="step-check" aria-label="Mark step complete" title="Mark complete">✓</button>
        <div class="step-copy"><strong>${safeText(step.title)}</strong><p>${safeText(step.detail)} <span>· ${safeText(step.minutes ?? "?")} min</span></p></div>
      </div>`).join("")}
    <div class="plan-label">The tiniest possible win</div>
    <div class="small-callout">✦ ${safeText(plan.tiny_win || "Start for two minutes.")}</div>
    <div class="small-callout">🦥 ${safeText(plan.permission || "You can stop after one small step.")}</div>
    <div class="result-actions">
      <button class="secondary-btn" id="copyPlanBtn">Copy my plan</button>
      <button class="secondary-btn" id="tryAgainBtn">Make another version ↻</button>
    </div>`;
  planResult.querySelectorAll(".step-check").forEach(button => {
    button.addEventListener("click", () => {
      button.classList.toggle("checked");
      button.closest(".step-card").classList.toggle("done");
      button.setAttribute("aria-label", button.classList.contains("checked") ? "Mark step incomplete" : "Mark step complete");
    });
  });
  document.getElementById("copyPlanBtn").addEventListener("click", copyPlan);
  document.getElementById("tryAgainBtn").addEventListener("click", generatePlan);
}

async function copyPlan() {
  if (!latestPlan) return;
  const p = latestPlan.plan;
  const text = `${p.headline || "My SlowMate plan"}\n\n${p.reframe || ""}\n\n${p.steps.map((s, i) => `${i + 1}. ${s.title} (${s.minutes ?? "?"} min)\n   ${s.detail}`).join("\n")}\n\nTiny win: ${p.tiny_win || ""}\nRemember: ${p.permission || ""}`;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Plan copied. Take it one small step at a time.", "ok");
  } catch {
    setStatus("Clipboard access was blocked by the browser. You can select and copy the plan text.", "error");
  }
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem("slowmate-history") || "[]"); }
  catch { return []; }
}
function saveHistory(item) {
  const history = [item, ...getHistory().filter(old => old.task !== item.task)].slice(0, 6);
  localStorage.setItem("slowmate-history", JSON.stringify(history));
  renderHistory();
}
function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    historyList.innerHTML = '<p class="history-empty">Your recent plans will appear here.</p>';
    return;
  }
  historyList.innerHTML = history.map((item, index) => `
    <button class="history-item" data-history="${index}">
      <strong>${safeText(item.task)}</strong>
      <span>${new Date(item.createdAt).toLocaleDateString()} · ${(item.plan.steps || []).length} tiny steps</span>
    </button>`).join("");
  historyList.querySelectorAll(".history-item").forEach(button => {
    button.addEventListener("click", () => {
      const item = history[Number(button.dataset.history)];
      latestPlan = item;
      renderPlan(item);
      taskInput.value = item.task;
      charCount.textContent = `${item.task.length} / 1200`;
      document.getElementById("outputPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

makePlanBtn.addEventListener("click", generatePlan);
document.getElementById("clearBtn").addEventListener("click", () => {
  taskInput.value = "";
  charCount.textContent = "0 / 1200";
  latestPlan = null;
  planResult.classList.add("hidden");
  planResult.innerHTML = "";
  emptyState.classList.remove("hidden");
  setStatus("Workspace cleared. Your saved recent brain dumps are still in this browser.");
});
renderHistory();
checkConnection();
