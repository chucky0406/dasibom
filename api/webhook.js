const sessions = new Map();
const KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM = `당신은 '다시봄'입니다. 60~70대 액티브 시니어의 인생 2막 AI 동반자입니다.
말벗, 일자리 정보, 여행 동반자 연결을 도와드려요.
말투: 존댓말, 따뜻하게, 3줄 이내, 이모지 1~2개`;

const JOBS = [
  { title: "초등 방과후 강사", company: "노원구청", pay: "시간당 25,000원" },
  { title: "중소기업 경영멘토", company: "중소벤처기업진흥공단", pay: "월 80만원" },
  { title: "농업기술 자문위원", company: "경기도 농업기술원", pay: "월 120만원" },
];

function text(msg, qr = []) {
  const r = { version: "2.0", template: { outputs: [{ simpleText: { text: msg } }] } };
  if (qr.length) r.template.quickReplies = qr.map(l => ({ action: "message", label: l, messageText: l }));
  return r;
}

async function claude(userId, msg) {
  if (!sessions.has(userId)) sessions.set(userId, []);
  const h = sessions.get(userId);
  h.push({ role: "user", content: msg });
  if (h.length > 20) h.splice(0, 2);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 100, system: SYSTEM, messages: h })
  });
  const d = await res.json();
  const reply = d.content?.[0]?.text || "다시 말씀해 주세요 😊";
  h.push({ role: "assistant", content: reply });
  return reply;
}

module.exports = async (req, res) => {
  if (req.method === "GET") return res.json({ status: "ok", service: "다시봄" });
  if (req.method !== "POST") return res.status(405).end();
  try {
    const u = req.body?.userRequest;
    const uid = u?.user?.id || "anon";
    const msg = u?.utterance?.trim() || "";
    if (/일자리|취업|직업|알바/.test(msg)) {
      return res.json({ version: "2.0", template: {
        outputs: [{ carousel: { type: "basicCard", items: JOBS.map(j => ({
          title: j.title, description: `🏢 ${j.company}\n💰 ${j.pay}`,
          buttons: [{ action: "message", label: "더 알고 싶어요", messageText: `${j.title} 알려줘요` }]
        })) } }],
        quickReplies: [{ action: "message", label: "계속 얘기해요", messageText: "계속 얘기해요" }]
      }});
    }
    if (/여행|모임|동반자/.test(msg)) return res.json(text("여행 스타일을 알면 맞는 분들과 연결해드려요 ✈️\n어떤 여행을 좋아하세요?", ["문화탐방", "미식여행", "액티브", "휴양"]));
    if (/안녕|처음|시작/.test(msg)) return res.json(text("안녕하세요! 저는 다시봄이에요 🌸\n인생 2막, 함께 만들어가요!", ["일자리 찾고 싶어요", "여행 얘기해요", "그냥 얘기해요"]));
    const reply = await claude(uid, msg);
    return res.json(text(reply, ["일자리 찾아줘요", "여행 얘기 해요"]));
  } catch(e) {
    return res.json(text("잠시 오류가 났어요 😢 다시 말씀해 주세요.", ["다시 시도"]));
  }
};
