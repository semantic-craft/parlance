(function () {
  const vscode = acquireVsCodeApi();
  const root = document.getElementById("root");

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function slot() {
    return document.getElementById("suggest-slot");
  }

  function showLoading(target, text) {
    target.replaceChildren(element("div", "loading", text));
  }

  function showResults(hits) {
    const nodes = [];
    if (hits.length > 0) {
      const bar = element("div", "suggest-bar");
      const button = element("button", "", "✍ 生成改写建议");
      button.id = "suggest-btn";
      bar.appendChild(button);
      nodes.push(bar);
    }

    const suggestSlot = element("div");
    suggestSlot.id = "suggest-slot";
    nodes.push(suggestSlot);

    const hitList = element("div");
    hitList.id = "hits";
    if (hits.length === 0) {
      hitList.appendChild(
        element(
          "div",
          "empty",
          "没有找到相近表达。换个说法,或先运行 zsearch sync。",
        ),
      );
    } else {
      hits.forEach((hit, index) => {
        const card = element("div", "hit");
        const head = element("div", "hit-head");
        head.append(
          element("span", "rank", String(index + 1)),
          element("span", "dist", `距离 ${Number(hit.distance).toFixed(3)}`),
        );
        card.append(
          head,
          element("blockquote", "snippet", hit.snippet),
          element("div", "source", hit.source),
        );

        const actions = element("div", "actions");
        const copy = element("button", "copy-btn", "复制");
        copy.dataset.copy = hit.snippet;
        const jump = element("button", "jump-btn", "跳 Zotero");
        jump.dataset.key = hit.key;
        actions.append(copy, jump);
        card.appendChild(actions);
        hitList.appendChild(card);
      });
    }
    nodes.push(hitList);
    root.replaceChildren(...nodes);
  }

  function providerLabel(model) {
    if (!model) return "";
    if (/^qwen/i.test(model)) return "Qwen";
    if (/^gemini/i.test(model)) return "Gemini";
    return model;
  }

  function section(title) {
    const node = element("div", "sg-sec");
    node.appendChild(element("div", "sg-h", title));
    return node;
  }

  function showSuggestions(suggestion) {
    const container = element("div", "suggestion");
    const warning = element("div", "sg-warn", "⚠ 模型生成,请核验");
    const provider = providerLabel(suggestion.model);
    if (provider) {
      warning.appendChild(
        element(
          "span",
          "sg-model",
          ` · 由 ${provider} 生成${suggestion.model ? `(${suggestion.model})` : ""}`,
        ),
      );
    }
    container.appendChild(warning);

    const diagnosis = section("诊断");
    diagnosis.appendChild(element("div", "sg-diag", suggestion.diagnosis));
    container.appendChild(diagnosis);

    const rewrites = section("改写");
    (suggestion.rewrites || []).forEach((rewrite) => {
      const row = element("div", "rw");
      row.append(
        element("div", "rw-text", rewrite.text),
        element("div", "rw-basis", `← ${rewrite.basis}`),
      );
      const copy = element("button", "copy-btn", "复制");
      copy.dataset.copy = rewrite.text;
      row.appendChild(copy);
      rewrites.appendChild(row);
    });
    container.appendChild(rewrites);

    const phrasings = section("可借用措辞");
    const list = element("ul", "sg-ph");
    (suggestion.phrasings || []).forEach((phrasing) => {
      const item = element("li", "", `${phrasing.text} `);
      item.appendChild(element("span", "src", `— ${phrasing.source}`));
      list.appendChild(item);
    });
    phrasings.appendChild(list);
    container.appendChild(phrasings);

    const target = slot();
    if (target) target.replaceChildren(container);
  }

  window.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg.type === "loading") {
      showLoading(root, "检索中…");
    } else if (msg.type === "results") {
      showResults(Array.isArray(msg.hits) ? msg.hits : []);
    } else if (msg.type === "error") {
      const d = document.createElement("div");
      d.className = "error";
      d.textContent = msg.message;
      root.replaceChildren(d);
    } else if (msg.type === "suggestion-loading") {
      const s = slot();
      if (s) showLoading(s, "生成建议中…");
    } else if (msg.type === "suggestions") {
      if (msg.suggestion) showSuggestions(msg.suggestion);
    } else if (msg.type === "suggestion-error") {
      const s = slot();
      if (s) {
        const d = document.createElement("div");
        d.className = "error";
        d.textContent = msg.message;
        s.replaceChildren(d);
      }
    }
  });

  root.addEventListener("click", (e) => {
    const target = e.target;
    if (target.id === "suggest-btn") {
      const s = slot();
      if (s) showLoading(s, "生成建议中…");
      vscode.postMessage({ type: "suggest" });
    } else if (target.classList.contains("copy-btn")) {
      vscode.postMessage({
        type: "copy",
        text: target.getAttribute("data-copy"),
      });
    } else if (target.classList.contains("jump-btn")) {
      vscode.postMessage({
        type: "jump",
        key: target.getAttribute("data-key"),
      });
    }
  });
})();
