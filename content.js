(async () => {
  const emojis = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getEmojis' }, (response) => {
      resolve(response);
    });
  });

  if (!emojis)  return;
  console.log('%c[Emoji Replacer] load successfully!','color: white; background-color: #28a745; font-size: 16px;');
  console.log('%cGithub: https://github.com/Gidroponik/emoji_changer','color: black; background-color: #e2bfff; font-size: 14px;');

  const emojiMap = await Promise.all(
    emojis.map(async (emoji) => {
      const response = await fetch(chrome.runtime.getURL(`img/${emoji.img}`));
      const response2x = await fetch(chrome.runtime.getURL(`img/${emoji.img2x}`));
      const blob = await response.blob();
      const blob2x = await response2x.blob();
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const dataUrl2x = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob2x);
      });
      return {
        symbol: emoji.symbol,
        imgTag: `<img class="emoji" src="${dataUrl}" alt="${emoji.symbol}">`,
        imgTag2x: `<img class="emoji emoji-2x" src="${dataUrl2x}" alt="${emoji.symbol}">`,
      };
    })
  ).then((emojiImgTags) =>
    emojiImgTags.reduce((map, emoji) => {
      map[emoji.symbol] = { imgTag: emoji.imgTag, imgTag2x: emoji.imgTag2x };
      return map;
    }, {})
  );

  const style = document.createElement('style');
  style.textContent = `
    .emoji {
      width: 16px;
      height: 16px;
      border: 0;
      margin: 0 1px;
    }
    .emoji-2x {
      width: 32px;
      height: 32px;
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
        const fontSize = parseFloat(getComputedStyle(parentNode).fontSize);
        const isLarge = fontSize > 16;
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
            tempElement.innerHTML = isLarge ? emojiMap[part].imgTag2x : emojiMap[part].imgTag;
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
