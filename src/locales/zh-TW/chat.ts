import zhCNChat from "../zh-CN/chat";

export default {
  ...zhCNChat,
  title: "對話紀錄",
  export: {
    ...zhCNChat.export,
    preview: "預覽",
  },
};
