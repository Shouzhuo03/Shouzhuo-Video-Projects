window.DeskConfig = {
  pageTitle: '分身乏术 · 桌面',
  endingTitle: '分身乏术',
  meLabel: '我',
  copyLabel: n => (n === 1 ? '我 副本' : `我 副本 ${n}`),

  windows: [
    { id: 'work', big: true, from: '老板', text: '今晚加班', followUps: ['方案呢？', '人呢？', '马上回复！', '在吗？', '人呢？'] },
    { id: 'home', big: true, from: '老婆', text: '回家吃饭吗？', followUps: ['怎么还不回来？', '菜凉了', '在哪呢？', '人呢？', '还回来吗？'] },
    { id: 'drink', big: true, from: '老王', text: '今晚喝一杯？', followUps: ['还来吗？', '就等你了', '人呢？', '干杯！', '走了？'] },
    { id: 'run', big: true, from: '跑团', text: '明早一起跑步' },
    { id: 'fish', big: true, from: '钓友', text: '周末去钓鱼' },
    { id: 's1', from: '球友', text: '打球？' },
    { id: 's2', from: '大学同学', text: '今晚聚会！' },
    { id: 's3', from: '游戏好友', text: '开黑来不来' },
    { id: 's4', from: '手机', text: '刷会儿？' },
    { id: 's5', from: 'K 歌群', text: 'K 歌走起' },
    { id: 's6', from: '朋友', text: '逛街吗' },
    { id: 's7', from: '提醒事项', text: '该遛狗了' },
  ],

  contextMenu: ['打开', '复制', '显示简介', '移到废纸篓'],
  menuBar: ['访达', '文件', '编辑', '显示', '前往', '窗口', '帮助'],
  clock: {
    dayLabel: '周一 下午',
    startTime: '18:21:40',
  },

  fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "Noto Sans SC Fallback", sans-serif',
};
