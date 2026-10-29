export const CATEGORIES = ["Phantom Thieves", "Shujin Academy", "Metaverse", "Requests", "Rumors"];

export function seedState(now = Date.now()) {
  const ago = minutes => new Date(now - minutes * 60000).toISOString();
  return {
    version: 1,
    currentUserID: 1,
    users: [
      { id: 1, nickname: "XMo", pfp: 5 },
      { id: 2, nickname: "Futaba", pfp: 6 },
      { id: 3, nickname: "Joker", pfp: 1 },
    ],
    posts: [
      { id: 101, user_id: 1, title: "A calling card for every idea.", categories: ["Phantom Thieves"],
        content: "Welcome to the hideout.\n\nA place to share what you are building, ask a question, or get a conversation started. Every post is a calling card. Every reply leaves a mark.\n\nPull up a chair. What have you been working on?", created_at: ago(12), like_count: 18, dislike_count: 0 },
      { id: 102, user_id: 2, title: "Tell me your most satisfying coding fix.", categories: ["Shujin Academy", "Requests"],
        content: "Mine was chasing a disappearing message through three tabs, only to find two listeners doing the same job.\n\nOne cleanup function later: silence. Beautiful, glorious silence. What was yours?", created_at: ago(38), like_count: 12, dislike_count: 0 },
      { id: 103, user_id: 3, title: "Tonight's soundtrack: Last Surprise.", categories: ["Rumors"],
        content: "Some songs make even a late-night debugging session feel like a heist.\n\nWhat's on your playlist when you need to get into the zone?", created_at: ago(65), like_count: 15, dislike_count: 1 },
      { id: 104, user_id: 1, title: "Which Palace has the best atmosphere?", categories: ["Metaverse"],
        content: "The music, the colour, the architecture: every Palace has its own personality.\n\nI keep coming back to the way the whole world and the interface feel like they belong together. Which one stayed with you? Keep it spoiler-free for the newcomers.", created_at: ago(110), like_count: 9, dislike_count: 0 },
      { id: 105, user_id: 2, title: "Show us what you're building.", categories: ["Shujin Academy", "Requests"],
        content: "A tiny game? Your first API? A project that started as a joke and got out of hand?\n\nDrop a little progress update. The unfinished things deserve a place on the board too.", created_at: ago(180), like_count: 11, dislike_count: 0 },
      { id: 106, user_id: 3, title: "A quiet table at Café Leblanc.", categories: ["Phantom Thieves"],
        content: "Coffee on the table. Rain against the window. A few friends trading ideas.\n\nNot every conversation needs a mission. Sometimes it's enough to check in. How's your week going?", created_at: ago(240), like_count: 7, dislike_count: 0 },
    ],
    comments: [
      { id: 201, post_id: 101, user_id: 2, content: "A hideout on the internet? You had me at calling cards.", like_count: 6, dislike_count: 0 },
      { id: 202, post_id: 101, user_id: 3, content: "The phone messages are a nice touch. Feels like the team is one tap away.", like_count: 5, dislike_count: 0 },
      { id: 203, post_id: 101, user_id: 1, content: "That was the idea. Familiar places, new conversations. Make yourselves at home.", like_count: 4, dislike_count: 0 },
      { id: 204, post_id: 102, user_id: 1, content: "Fixing a reconnect bug and watching every message arrive exactly once. Very satisfying.", like_count: 3, dislike_count: 0 },
      { id: 205, post_id: 102, user_id: 3, content: "The best bug is the one you can finally explain in one sentence.", like_count: 4, dislike_count: 0 },
      { id: 206, post_id: 103, user_id: 2, content: "Beneath the Mask for writing code. Last Surprise for finding out what I broke.", like_count: 8, dislike_count: 0 },
      { id: 207, post_id: 104, user_id: 3, content: "The first time the music and the environment click together is hard to beat.", like_count: 3, dislike_count: 0 },
      { id: 208, post_id: 105, user_id: 1, content: "This forum. Started with vanilla JavaScript, then the phone UI became a project of its own.", like_count: 5, dislike_count: 0 },
      { id: 209, post_id: 106, user_id: 2, content: "Still awake, still tinkering. Save me a seat.", like_count: 2, dislike_count: 0 },
    ],
    messages: [
      { id: 301, sender_id: 2, receiver_id: 1, content: "Okay, I found the hideout. This place has style.", created_at: ago(8), is_read: true },
      { id: 302, sender_id: 1, receiver_id: 2, content: "Wait until you open a calling card.", created_at: ago(7), is_read: true },
      { id: 303, sender_id: 2, receiver_id: 1, content: "A forum that feels like the Metaverse? I'm in.", created_at: ago(6), is_read: true },
      { id: 304, sender_id: 1, receiver_id: 2, content: "Then let's give everyone something worth talking about.", created_at: ago(5), is_read: true },
      { id: 305, sender_id: 2, receiver_id: 1, content: "Deal. What are you building next?", created_at: ago(4), is_read: true },
      { id: 306, sender_id: 3, receiver_id: 1, content: "Coffee's ready. Got a minute?", created_at: ago(32), is_read: true },
      { id: 307, sender_id: 1, receiver_id: 3, content: "Always. Anything new on the board?", created_at: ago(30), is_read: true },
      { id: 308, sender_id: 3, receiver_id: 1, content: "A few good ideas. Yours could be next.", created_at: ago(28), is_read: true },
    ],
    reactions: {},
    replyIndex: {},
  };
}

const REPLIES = {
  2: [
    "A new idea? Put it on a calling card. I'll be watching the board.",
    "The hideout is always open. Try a post, leave a reply, make a little noise.",
    "Roger that. Nothing beats seeing an idea turn into something you can actually use.",
    "You've got my attention. What's the next move?",
  ],
  3: [
    "Sounds like a plan. Take your time; the hideout isn't going anywhere.",
    "Every good idea starts with a conversation. Glad you stopped by.",
    "Leave a calling card on the board. I'll check it out.",
    "I'll save you a seat at Leblanc.",
  ],
  1: ["Make yourself at home. There's always room for another idea on the board."],
};

export function nextReply(state, memberID) {
  const replies = REPLIES[memberID] || REPLIES[1];
  const index = state.replyIndex[memberID] || 0;
  state.replyIndex[memberID] = index + 1;
  return replies[index % replies.length];
}
