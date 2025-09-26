// src/services/chatStorage.js
const kMsg = (caso) => `litisbot::msgs::${caso}`;
const kFiles = (caso) => `litisbot::files::${caso}`;

export function getMessages(caso = "default") {
  try {
    return JSON.parse(localStorage.getItem(kMsg(caso)) || "[]");
  } catch {
    return [];
  }
}

export function saveMessage(caso = "default", msg) {
  const list = getMessages(caso);
  list.push({
    ...msg,
    ts: msg?.ts || Date.now(),
  });
  localStorage.setItem(kMsg(caso), JSON.stringify(list));
}

export function deleteMessage(caso = "default", index) {
  const list = getMessages(caso);
  if (index >= 0 && index < list.length) {
    list.splice(index, 1);
    localStorage.setItem(kMsg(caso), JSON.stringify(list));
  }
}

export function clearMessages(caso = "default") {
  localStorage.removeItem(kMsg(caso));
}

export function getFiles(caso = "default") {
  try {
    return JSON.parse(localStorage.getItem(kFiles(caso)) || "[]");
  } catch {
    return [];
  }
}

export function saveFile(caso = "default", fileInfo) {
  const list = getFiles(caso);
  list.push({
    ...fileInfo,
    ts: fileInfo?.ts || Date.now(),
  });
  localStorage.setItem(kFiles(caso), JSON.stringify(list));
}

export function deleteFile(caso = "default", index) {
  const list = getFiles(caso);
  if (index >= 0 && index < list.length) {
    list.splice(index, 1);
    localStorage.setItem(kFiles(caso), JSON.stringify(list));
  }
}

export function clearFiles(caso = "default") {
  localStorage.removeItem(kFiles(caso));
}
