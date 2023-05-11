(async () => {
  const emojis = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getEmojis' }, (response) => {
      resolve(response);
    });
  });

  const emojiMap = await Promise.all(
    emojis.map(async (emoji) => {
      const response = await fetch(chrome.runtime.getURL(`img/${emoji.img}`));
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      return {
        symbol: emoji.symbol,
        imgTag: `<img class="emoji" src="${dataUrl}" alt="${emoji.symbol}">`,
      };
    })
  ).then((emojiImgTags) =>
    emojiImgTags.reduce((map, emoji) => {
      map[emoji.symbol] = emoji.imgTag;
      return map;
    }, {})
  );

  const style = document.createElement('style');
  style.textContent = `
    .emoji {
      width: 16px;
      height: 16px;
      border: 0;
      vertical-align: -3px;
      margin: 0 1px;
      display: inline-block;
      overflow: hidden;
    }
  `;
  document.head.appendChild(style);

  const replaceEmojis = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      let foundEmoji = false;

      for (const symbol in emojiMap) {
        if (node.textContent.includes(symbol)) {
          foundEmoji = true;
          break;
        }
      }

      if (foundEmoji) {
        const parentNode = node.parentNode;
        const emojiPattern = new RegExp(
          '(' +
            Object.keys(emojiMap)
              .map((symbol) => {
                return symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              })
              .join('|') +
            ')',
          'g'
        );
        const textParts = node.textContent.split(emojiPattern);

        textParts.forEach((part) => {
          if (emojiMap[part]) {
            const tempElement = document.createElement('template');
            tempElement.innerHTML = emojiMap[part];
            const emojiElement = tempElement.content.firstChild;
            parentNode.insertBefore(emojiElement, node);
          } else {
            parentNode.insertBefore(document.createTextNode(part), node);
          }
        });

        parentNode.removeChild(node);
      }
    } else {
      for (const childNode of node.childNodes) {
        replaceEmojis(childNode);
      }
    }
  };

  replaceEmojis(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        replaceEmojis(addedNode);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
