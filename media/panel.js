(function () {
  const vscode = acquireVsCodeApi();
  const root = document.getElementById("root");

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg.type === "loading") {
      root.innerHTML = '<div class="loading">检索中…</div>';
    } else if (msg.type === "results") {
      root.innerHTML = msg.html;
    } else if (msg.type === "error") {
      const d = document.createElement("div");
      d.className = "error";
      d.textContent = msg.message;
      root.replaceChildren(d);
    }
  });

  root.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("copy-btn")) {
      vscode.postMessage({ type: "copy", text: target.getAttribute("data-copy") });
    } else if (target.classList.contains("jump-btn")) {
      vscode.postMessage({ type: "jump", key: target.getAttribute("data-key") });
    }
  });
})();
