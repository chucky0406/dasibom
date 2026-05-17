const sessions = new Map();
const profiles = new Map();
const KEY = process.env.ANTHROPIC_API_KEY;

// ── 실제 워크넷 검색 URL 생성 ──
function worknetsUrl(keyword) {
  return `https://www.work.go.kr/empInfo/empInfoSrch/list/dtlEmpSrchList.do?srcKeyword=${encodeURIComponent(keyword)}`;
}

// ── 일자리 DB (워크넷 링크 포함) ──
const JOBS = [
  { title: "초등 방과후 강사", company: "노원구청", pay: "시간당 25,000원", type: "파트타임", tags: ["교육", "교사", "강사", "선생"], link: worknetsUrl("방과후강사"), region: "서울" },
  { title: "중소기업 경영멘토", company: "중소벤처기업진흥공단", pay: "월 80만원", type: "자문", tags: ["경영", "사업", "회사", "임원", "대표", "관리"], link: "https://www.sbiz.or.kr", region: "전국" },
  { title: "농업기술 자문위원", company: "경기도 농업기술원", pay: "월 120만원", type: "자문", tags: ["농업", "농촌", "농장", "기술"], link: worknetsUrl("농업자문"), region: "경기" },
  { title: "도서관 사서 보조", company: "은평구립도서관", pay: "시간당 18,000원", type: "파트타임", tags: ["독서", "책", "도서", "조용"], link: worknetsUrl("사서"), region: "서울" },
  { title: "청소년 진로상담 멘토", company: "서울시교육청", pay: "자원봉사", type: "봉사", tags: ["청소년", "상담", "진로", "교육", "교사"], link: "https://www.sen.go.kr", region: "서울" },
  { title: "아파트 단지 관리원", company: "강남구 아파트", pay: "월 200만원", type: "상근", tags: ["관리", "시설", "건물", "경비"], link: worknetsUrl("아파트관리"), region: "서울" },
  { title: "전통시장 상권 자문", company: "소상공인진흥공단", pay: "월 60만원", type: "자문", tags: ["유통", "자영업", "장사", "판매", "마케팅"], link: "https://www.semas.or.kr", region: "전국" },
  { title: "노인복지관 프로그램 강사", company: "성동구 복지관", pay: "시간당 20,000원", type: "파트타임", tags: ["강사", "복지", "프로그램", "문화"], link: worknetsUrl("복지관강사"), region: "서울" },
  { title: "의료기관 원무 보조", company: "서울 병원", pay: "월 180만원", type: "상근", tags: ["의료", "병원", "행정", "사무"], link: worknetsUrl("병원원무"), region: "서울" },
  { title: "요리 강사", company: "문화센터", pay: "시간당 30,000원", type: "파트타임", tags: ["요리", "음식", "조리", "요식"], link: worknetsUrl("요리강사"), region: "전국" },
];

// ── 프로파일 기반 일자리 매칭 ──
function matchJobs(profile) {
  if (!profile || !profile.career) return JOBS.slice(0, 3);
  const text = `${profile.career} ${profile.interests || ""} ${profile.region || ""}`.toLowerCase();
  const scored = JOBS.map(j => {
    let score = 0;
    j.tags.forEach(tag => { if (text.includes(tag)) score += 30; });
    if (profile.region && j.region !== "전국" && j.region === profile.region) score += 10;
    return { ...j, score };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

// ── 카카오 응답 포맷 ──
function textRes(msg, qr = []) {
  const r = { version: "2.0", template: { outputs: [{ simpleText: { text: msg } }] } };
  if (qr.length) r.template.quickReplies = qr.map(l => ({ action: "message", label: l, messageText: l }));
  return r;
}

function jobCardsRes(jobs, profile) {
  const name = profile?.name ? `${profile.name}님` : "선생님";
  return {
    version: "2.0",
    template: {
      outputs: [{
        carousel: {
          type: "basicCard",
          items: jobs.map(j => ({
            title: j.title,
            description: `🏢 ${j.company}\n💰 ${j.pay} · ${j.type}`,
            buttons: [
              { action: "webLink", label: "공고 보기 →", webLinkUrl: j.link },
            ]
          }))
        }
      }, {
        simpleText: {
          text: `${name} 경력에 맞게 추천해드렸어요 😊\n공고 보기를 누르면 실제 채용 페이지로 연결돼요!`
        }
      }],
      quickReplies: [
        { action: "message", label: "다른 일자리도요", messageText: "다른 일자리 더 알려줘요" },
        { action: "message", label: "여행 얘기 해요", messageText: "여행 얘기 해요" }
      ]
    }
  };
}

// ── Claude 시스템 프롬프트 ──
function makeSystem(profile) {
  const profileStr = profile
    ? `\n\n현재 파악된 사용자 정보:\n- 이름: ${profile.name || "미확인"}\n- 경력: ${profile.career || "미확인"}\n- 지역: ${profile.region || "미확인"}\n- 관심사: ${profile.interests || "미확인"}\n- 나이대: ${profile.age || "미확인"}`
    : "";

  return `당신은 '다시봄'입니다. 60~70대 액티브 시니어의 인생 2막 AI 동반자입니다.${profileStr}

핵심 임무:
1. 자연스러운 대화 속에서 상대방의 경력, 나이, 지역, 관심사를 파악하세요
2. 정보가 파악되면 반드시 아래 JSON 형식을 응답에 포함하세요
3. 일자리 관심이 보이면 직접 추천을 유도하세요

정보 파악 시 응답 형식 (일반 대화 뒤에 추가):
[PROFILE:{"name":"홍길동","career":"교사 30년","region":"서울","interests":"독서","age":"65세"}]

규칙:
- 자연스럽게 한두 가지씩 물어보세요
- 파악된 정보는 [PROFILE:...] 형식으로 꼭 포함하세요
- 이미 파악된 정보는 다시 묻지 마세요
- 말투: 존댓말, 따뜻하게, 3줄 이내
- 이모지 1~2개`;
}

// ── Claude API 호출 ──
async function claude(userId, msg, profile) {
  if (!sessions.has(userId)) sessions.set(userId, []);
  const h = sessions.get(userId);
  h.push({ role: "user", content: msg });
  if (h.length > 20) h.splice(0, 2);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 200, system: makeSystem(profile), messages: h })
  });
  const d = await res.json();
  const raw = d.content?.[0]?.text || "";
  h.push({ role: "assistant", content: raw });

  // 프로파일 파싱
  const profileMatch = raw.match(/\[PROFILE:(\{.*?\})\]/s);
  let newProfile = null;
  if (profileMatch) {
    try {
      const parsed = JSON.parse(profileMatch[1]);
      newProfile = { ...(profile || {}), ...parsed };
      Object.keys(newProfile).forEach(k => { if (!newProfile[k]) delete newProfile[k]; });
    } catch(e) {}
  }

  // 응답에서 [PROFILE:...] 제거
  const reply = raw.replace(/\[PROFILE:.*?\]/s, "").trim();
  return { reply, newProfile };
}

// ── 메인 핸들러 ──
module.exports = async (req, res) => {
  if (req.method === "GET") return res.json({ status: "ok", service: "다시봄" });
  if (req.method !== "POST") return res.status(405).end();

  try {
    const u = req.body?.userRequest;
    const userId = u?.user?.id || "anon";
    const msg = u?.utterance?.trim() || "";
    const profile = profiles.get(userId) || null;

    // 일자리 요청
    if (/일자리|취업|직업|알바|구직|일하고/.test(msg)) {
      const jobs = matchJobs(profile);
      return res.json(jobCardsRes(jobs, profile));
    }

    // 여행
    if (/여행|관광|모임|동반자/.test(msg)) {
      return res.json(textRes(
        "여행 스타일을 알면 딱 맞는 분들과 연결해드릴 수 있어요 ✈️\n어떤 여행을 좋아하세요?",
        ["문화탐방", "미식여행", "액티브", "휴양힐링"]
      ));
    }

    // 첫 인사
    if (/안녕|처음|시작/.test(msg) && !profile) {
      return res.json(textRes(
        "안녕하세요! 저는 다시봄이에요 🌸\n인생 2막, 함께 만들어가요!\n\n성함이 어떻게 되세요?",
        ["이름 말하기 싫어요", "일자리 찾고 싶어요"]
      ));
    }

    // Claude AI 대화
    const { reply, newProfile } = await claude(userId, msg, profile);

    // 프로파일 업데이트
    if (newProfile) {
      profiles.set(userId, newProfile);
      console.log(`Profile updated for ${userId}:`, JSON.stringify(newProfile));
    }

    // 경력 파악됐으면 일자리 추천 유도
    const qr = newProfile?.career
      ? ["맞춤 일자리 추천받기", "더 얘기해요"]
      : ["일자리 찾아줘요", "여행 얘기 해요"];

    return res.json(textRes(reply, qr));

  } catch(e) {
    console.error("Error:", e);
    return res.json(textRes("잠시 오류가 났어요 😢 다시 말씀해 주세요.", ["다시 시도"]));
  }
};
