import { useState, useRef, useEffect } from "react";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

// ══════════════════════════════════════════════════
// 성향 분석 차원
// ══════════════════════════════════════════════════
const PERSONALITY_DIMS = {
  travel: { label: "여행 스타일", options: ["액티브 탐험가", "문화·역사 탐방", "미식 여행", "휴양·힐링"] },
  energy: { label: "에너지", options: ["활동적", "여유로운"] },
  social: { label: "사교성", options: ["새 사람 만나기 좋아함", "소수 깊게 사귐"] },
  group: { label: "동행 선호", options: ["2~3명 소그룹", "5~8명 중그룹"] },
  interest: { label: "관심사", options: ["자연·등산", "역사·문화", "음식·맛집", "예술·공연", "골프·스포츠"] },
};

// ══════════════════════════════════════════════════
// 샘플 유저 DB (실서비스는 실제 DB)
// ══════════════════════════════════════════════════
const SAMPLE_USERS = [
  { id: 1, name: "박선생님", age: "65세", region: "서울 노원", career: "고등학교 국어교사 35년", personality: { travel: "문화·역사 탐방", energy: "여유로운", social: "소수 깊게 사귐", group: "2~3명 소그룹", interest: "역사·문화" }, recentTrip: "경주 신라 문화 탐방", nextPlan: "일본 교토 여행", avatar: "👨‍🏫", tags: ["역사", "독서", "글쓰기"] },
  { id: 2, name: "김원장님", age: "62세", region: "서울 강남", career: "내과 의원 원장 25년", personality: { travel: "미식 여행", energy: "활동적", social: "새 사람 만나기 좋아함", group: "5~8명 중그룹", interest: "음식·맛집" }, recentTrip: "프랑스 미식 투어", nextPlan: "이탈리아 남부", avatar: "👨‍⚕️", tags: ["와인", "요리", "골프"] },
  { id: 3, name: "이사장님", age: "68세", region: "경기 성남", career: "중소기업 CEO 20년", personality: { travel: "액티브 탐험가", energy: "활동적", social: "새 사람 만나기 좋아함", group: "5~8명 중그룹", interest: "자연·등산" }, recentTrip: "네팔 히말라야 트레킹", nextPlan: "페루 마추픽추", avatar: "🧗", tags: ["등산", "마라톤", "골프"] },
  { id: 4, name: "최교수님", age: "63세", region: "서울 마포", career: "대학 경제학과 교수 28년", personality: { travel: "문화·역사 탐방", energy: "여유로운", social: "소수 깊게 사귐", group: "2~3명 소그룹", interest: "예술·공연" }, recentTrip: "빈 오페라 투어", nextPlan: "체코 프라하", avatar: "👨‍🎓", tags: ["클래식", "독서", "미술관"] },
  { id: 5, name: "정원장님", age: "64세", region: "부산", career: "한의원 원장 30년", personality: { travel: "휴양·힐링", energy: "여유로운", social: "소수 깊게 사귐", group: "2~3명 소그룹", interest: "자연·등산" }, recentTrip: "제주도 올레길", nextPlan: "발리 힐링 여행", avatar: "🌿", tags: ["건강", "명상", "요리"] },
  { id: 6, name: "강대표님", age: "66세", region: "서울 서초", career: "광고회사 대표 22년", personality: { travel: "미식 여행", energy: "활동적", social: "새 사람 만나기 좋아함", group: "5~8명 중그룹", interest: "예술·공연" }, recentTrip: "뉴욕 브로드웨이", nextPlan: "스페인 바르셀로나", avatar: "🎨", tags: ["사진", "와인", "재즈"] },
];

// ══════════════════════════════════════════════════
// 여행 그룹 DB
// ══════════════════════════════════════════════════
const TRAVEL_GROUPS = [
  { id: 1, title: "교토·나라 역사 문화 탐방", date: "2026년 7월 15~19일", members: 3, maxMembers: 5, style: "문화·역사 탐방", leader: "박선생님", tags: ["일본", "역사", "사찰"], image: "⛩️", cost: "약 150만원" },
  { id: 2, title: "이탈리아 남부 미식 여행", date: "2026년 9월 8~15일", members: 4, maxMembers: 8, style: "미식 여행", leader: "김원장님", tags: ["유럽", "음식", "와인"], image: "🍝", cost: "약 300만원" },
  { id: 3, title: "제주 올레길 힐링 트레킹", date: "2026년 6월 20~23일", members: 2, maxMembers: 4, style: "휴양·힐링", leader: "정원장님", tags: ["국내", "자연", "걷기"], image: "🌊", cost: "약 50만원" },
  { id: 4, title: "스페인 바르셀로나 예술 기행", date: "2026년 10월 5~12일", members: 3, maxMembers: 6, style: "문화·역사 탐방", leader: "강대표님", tags: ["유럽", "예술", "건축"], image: "🏛️", cost: "약 280만원" },
  { id: 5, title: "히말라야 안나푸르나 트레킹", date: "2026년 11월 1~10일", members: 5, maxMembers: 8, style: "액티브 탐험가", leader: "이사장님", tags: ["아시아", "등산", "모험"], image: "🏔️", cost: "약 200만원" },
];

// ══════════════════════════════════════════════════
// 성향 매칭 함수
// ══════════════════════════════════════════════════
function matchScore(userP, targetP) {
  if (!userP || !targetP) return 0;
  let score = 0;
  if (userP.travel === targetP.travel) score += 40;
  if (userP.energy === targetP.energy) score += 20;
  if (userP.social === targetP.social) score += 20;
  if (userP.group === targetP.group) score += 10;
  if (userP.interest === targetP.interest) score += 10;
  return score;
}

function findMatches(userPersonality) {
  return SAMPLE_USERS
    .map(u => ({ ...u, score: matchScore(userPersonality, u.personality) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function matchGroups(userPersonality) {
  if (!userPersonality?.travel) return TRAVEL_GROUPS.slice(0, 3);
  return TRAVEL_GROUPS
    .filter(g => g.style === userPersonality.travel || g.members < g.maxMembers)
    .slice(0, 3);
}

// ══════════════════════════════════════════════════
// TOOLS
// ══════════════════════════════════════════════════
const TOOLS = [
  {
    name: "analyze_personality",
    description: "대화 내용을 바탕으로 사용자의 성향을 분석하고 저장합니다. 여행, 취미, 생활 방식에 대한 이야기가 충분히 쌓이면 호출하세요.",
    input_schema: {
      type: "object",
      properties: {
        travel: { type: "string", enum: ["액티브 탐험가", "문화·역사 탐방", "미식 여행", "휴양·힐링"] },
        energy: { type: "string", enum: ["활동적", "여유로운"] },
        social: { type: "string", enum: ["새 사람 만나기 좋아함", "소수 깊게 사귐"] },
        group: { type: "string", enum: ["2~3명 소그룹", "5~8명 중그룹"] },
        interest: { type: "string", enum: ["자연·등산", "역사·문화", "음식·맛집", "예술·공연", "골프·스포츠"] },
        summary: { type: "string", description: "성향 한 줄 요약" }
      }
    }
  },
  {
    name: "find_peers",
    description: "성향이 비슷한 또래 시니어를 추천합니다. 사용자가 사람 만나기, 여행 동반자, 친구 찾기를 언급하거나 성향 분석이 끝난 후 호출하세요.",
    input_schema: { type: "object", properties: { reason: { type: "string" } } }
  },
  {
    name: "find_travel_groups",
    description: "성향에 맞는 여행 모임을 추천합니다. 여행 계획, 같이 여행, 모임 참여를 언급할 때 호출하세요.",
    input_schema: { type: "object", properties: { destination: { type: "string" }, style: { type: "string" } } }
  },
  {
    name: "create_travel_group",
    description: "새로운 여행 모임을 만듭니다. 직접 모임을 만들고 싶다고 할 때 호출하세요.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        destination: { type: "string" },
        date: { type: "string" },
        style: { type: "string" },
        maxMembers: { type: "number" }
      },
      required: ["title", "destination"]
    }
  },
  {
    name: "search_jobs",
    description: "일자리·사회참여 기회 탐색.",
    input_schema: { type: "object", properties: { keyword: { type: "string" } }, required: ["keyword"] }
  },
  {
    name: "add_bucket_list",
    description: "버킷리스트 추가.",
    input_schema: { type: "object", properties: { item: { type: "string" }, category: { type: "string", enum: ["여행", "배움", "취미", "관계", "도전", "기타"] } }, required: ["item", "category"] }
  },
  {
    name: "save_insight",
    description: "대화에서 파악된 기본 정보 저장.",
    input_schema: { type: "object", properties: { name: { type: "string" }, career: { type: "string" }, region: { type: "string" }, age: { type: "string" }, interests: { type: "string" } } }
  }
];

// ══════════════════════════════════════════════════
// SYSTEM PROMPT
// ══════════════════════════════════════════════════
const SYSTEM = `당신은 '다솜'입니다. 60~70대 액티브 시니어의 인생 2막을 함께하는 AI 동반자입니다.

핵심 임무: 대화를 통해 자연스럽게 사용자의 성향을 파악하고, 비슷한 사람들과 연결해주세요.

성향 파악 전략:
- 여행 이야기가 나오면 → 어떤 스타일인지 자연스럽게 물어보기
- 취미·관심사 이야기 → 에너지 레벨, 사교성 파악
- 3~4번 대화 후 충분한 정보가 쌓이면 → analyze_personality 호출
- 성향 파악 후 자연스럽게 → find_peers 또는 find_travel_groups 제안

툴 호출 기준:
- 여행·취미 대화 3~4회 쌓임 → analyze_personality
- "사람 만나고 싶다" "여행 같이" "동반자" → find_peers
- "여행 모임" "같이 가고 싶다" "그룹" → find_travel_groups  
- "모임 만들고 싶다" → create_travel_group
- 일·취업 → search_jobs
- 꿈·하고싶다 → add_bucket_list
- 이름·경력 언급 → save_insight

말투: 존댓말, 따뜻하고 대등하게, 3줄 이내
절대 금지: 돌봄 말투, 가족 언급, "괜찮으세요?"`;

// ══════════════════════════════════════════════════
// TOOL EXECUTOR
// ══════════════════════════════════════════════════
const JOB_DB = [
  { title: "초등 방과후 강사", company: "노원구청", pay: "시간당 25,000원", type: "강사", tags: ["교육", "국어", "교사"], badge: "🏫" },
  { title: "중소기업 경영 멘토", company: "중소벤처기업진흥공단", pay: "월 80만원", type: "자문", tags: ["경영", "멘토"], badge: "💼" },
  { title: "청소년 진로 멘토", company: "서울시교육청", pay: "자원봉사", type: "봉사", tags: ["청소년", "멘토"], badge: "🌱" },
];

function executeTool(name, input, ctx) {
  const { personality, setPersonality, bucketList, setBucketList, profile, setProfile } = ctx;

  switch (name) {
    case "analyze_personality": {
      const p = { travel: input.travel, energy: input.energy, social: input.social, group: input.group, interest: input.interest, summary: input.summary };
      setPersonality(p);
      try { window._set("dasom_personality", JSON.stringify(p)); } catch {}
      return { type: "personality_result", personality: p };
    }
    case "find_peers": {
      const matches = findMatches(personality);
      return { type: "peers", users: matches, hasPersonality: !!personality?.travel };
    }
    case "find_travel_groups": {
      const groups = matchGroups(personality);
      return { type: "travel_groups", groups };
    }
    case "create_travel_group": {
      const group = { id: Date.now(), title: input.title, destination: input.destination, date: input.date || "날짜 미정", style: input.style || "자유", maxMembers: input.maxMembers || 6, members: 1, leader: profile.name || "나", tags: [input.destination], image: "✈️", cost: "미정" };
      return { type: "group_created", group };
    }
    case "search_jobs":
      return { type: "jobs", jobs: JOB_DB.slice(0, 3) };
    case "add_bucket_list": {
      const item = { id: Date.now(), item: input.item, category: input.category, done: false };
      const updated = [item, ...bucketList];
      setBucketList(updated);
      try { window._set("dasom_bucket", JSON.stringify(updated)); } catch {}
      return { type: "bucket_added", item };
    }
    case "save_insight": {
      const updated = { ...profile };
      Object.keys(input).forEach(k => { if (input[k]) updated[k] = input[k]; });
      setProfile(updated);
      try { window._set("dasom_profile", JSON.stringify(updated)); } catch {}
      return { type: "insight_saved" };
    }
    default: return { type: "unknown" };
  }
}

function now() { return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }); }

// ══════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════
export default function DasomV5() {
  const [page, setPage] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ name: "", career: "", region: "", age: "", interests: "" });
  const [personality, setPersonality] = useState(null);
  const [bucketList, setBucketList] = useState([]);
  const [apiHistory, setApiHistory] = useState([]);
  const [ready, setReady] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const p = window._get("dasom_profile"); if (p?.value) setProfile(JSON.parse(p.value));
        const per = window._get("dasom_personality"); if (per?.value) setPersonality(JSON.parse(per.value));
        const b = window._get("dasom_bucket"); if (b?.value) setBucketList(JSON.parse(b.value));
        const h = window._get("dasom_v5_hist"); if (h?.value) { const d = JSON.parse(h.value); setMessages(d.m || []); setApiHistory(d.a || []); }
      } catch {}
      setMessages(prev => prev.length ? prev : [{
        role: "assistant",
        content: "안녕하세요! 저는 다솜이에요 🌸\n\n요즘 어떻게 지내세요?\n여행이나 취미 이야기 들려주시면 비슷한 분들도 소개해드릴 수 있어요 😊",
        ui: null, time: now()
      }]);
      setReady(true);
    };
    init();
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const chat = async (text) => {
    if (!text?.trim() || loading) return;
    setInput("");
    setLoading(true);
    const ctx = { personality, setPersonality, bucketList, setBucketList, profile, setProfile };
    const hist = [...apiHistory, { role: "user", content: text }];
    const msgs = [...messages, { role: "user", content: text, time: now() }];
    setMessages(msgs);

    try {
      const r1 = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYSTEM, tools: TOOLS, messages: hist })
      });
      const d1 = await r1.json();
      let txt = "", uiBlocks = [], h2 = [...hist, { role: "assistant", content: d1.content }];

      if (d1.stop_reason === "tool_use") {
        const uses = d1.content.filter(b => b.type === "tool_use");
        const results = uses.map(tb => {
          const res = executeTool(tb.name, tb.input, ctx);
          uiBlocks.push(res);
          return { type: "tool_result", tool_use_id: tb.id, content: JSON.stringify(res) };
        });
        h2 = [...h2, { role: "user", content: results }];
        const r2 = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYSTEM, tools: TOOLS, messages: h2 })
        });
        const d2 = await r2.json();
        const t2 = d2.content?.find(b => b.type === "text"); if (t2) txt = t2.text;
        h2 = [...h2, { role: "assistant", content: d2.content }];
      } else {
        const t = d1.content?.find(b => b.type === "text"); if (t) txt = t.text;
      }

      const final = [...msgs, { role: "assistant", content: txt, ui: uiBlocks.filter(b => b.type !== "insight_saved"), time: now() }];
      setMessages(final); setApiHistory(h2);
      try { window._set("dasom_v5_hist", JSON.stringify({ m: final.slice(-30), a: h2.slice(-20) })); } catch {}
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "잠깐 오류가 났어요 😢 다시 말씀해 주세요.", ui: null, time: now() }]);
    }
    setLoading(false);
  };

  if (!ready) return <Splash />;

  const QUICK = ["최근에 여행 다녀왔어요", "여행 동반자 찾고 싶어요", "비슷한 분들 소개해줘요", "여행 모임 보여줘요"];

  return (
    <div style={S.root}>
      <Header profile={profile} personality={personality} page={page} />

      {page === "chat" && (
        <>
          <div style={S.chat}>
            {messages.length <= 1 && (
              <div style={S.quickWrap}>
                {QUICK.map((q, i) => <button key={i} style={S.quickBtn} onClick={() => chat(q)}>{q}</button>)}
              </div>
            )}
            {messages.map((m, i) => <MsgRow key={i} msg={m} onSend={chat} />)}
            {loading && <TypingRow />}
            <div ref={endRef} />
          </div>
          <InputBar input={input} setInput={setInput} onSend={chat} loading={loading} />
        </>
      )}

      {page === "peers" && <PeersPage personality={personality} onChat={(t) => { setPage("chat"); setTimeout(() => chat(t), 300); }} />}
      {page === "travel" && <TravelPage personality={personality} onChat={(t) => { setPage("chat"); setTimeout(() => chat(t), 300); }} />}
      {page === "profile" && <ProfilePage profile={profile} personality={personality} bucketList={bucketList} />}

      <BottomNav page={page} setPage={setPage} hasPersonality={!!personality} />
    </div>
  );
}

// ── 헤더 ──────────────────────────────────────────
function Header({ profile, personality, page }) {
  const titles = { chat: "다솜", peers: "비슷한 분들", travel: "여행 모임", profile: "나의 성향" };
  return (
    <div style={S.header}>
      <div style={S.hLeft}>
        <div style={S.logo}>🌸</div>
        <div>
          <div style={S.appName}>{titles[page]}</div>
          <div style={S.appSub}>{profile.name ? `${profile.name}님` : "인생 2막"}{personality?.summary ? ` · ${personality.summary}` : ""}</div>
        </div>
      </div>
      {personality && <div style={S.personalityChip}>{personality.travel}</div>}
    </div>
  );
}

// ── 바텀 네비 ──────────────────────────────────────
function BottomNav({ page, setPage, hasPersonality }) {
  const items = [
    { id: "chat", icon: "💬", label: "대화" },
    { id: "peers", icon: "👥", label: "비슷한 분들" },
    { id: "travel", icon: "✈️", label: "여행 모임" },
    { id: "profile", icon: "✨", label: "나의 성향" },
  ];
  return (
    <div style={S.nav}>
      {items.map(it => (
        <button key={it.id} style={{ ...S.navBtn, ...(page === it.id ? S.navOn : {}) }} onClick={() => setPage(it.id)}>
          <span style={S.navIcon}>{it.icon}</span>
          <span style={S.navLabel}>{it.label}</span>
          {(it.id === "peers" || it.id === "travel") && !hasPersonality && <span style={S.navTip}>대화 후</span>}
        </button>
      ))}
    </div>
  );
}

// ── 또래 페이지 ────────────────────────────────────
function PeersPage({ personality, onChat }) {
  const matches = personality ? findMatches(personality) : SAMPLE_USERS.slice(0, 3);
  return (
    <div style={S.page}>
      {!personality && (
        <div style={S.tipCard}>
          <div style={S.tipIcon}>💡</div>
          <div>
            <div style={S.tipTitle}>다솜이와 대화를 나눠보세요</div>
            <div style={S.tipSub}>여행, 취미 이야기를 하면 비슷한 분들을 정확하게 추천해드려요</div>
          </div>
        </div>
      )}
      {personality && (
        <div style={S.matchHeader}>
          <div style={S.matchTitle}>"{personality.travel}" 성향으로</div>
          <div style={S.matchSub}>잘 맞을 것 같은 분들이에요</div>
        </div>
      )}
      {matches.map(u => (
        <div key={u.id} style={S.peerCard}>
          <div style={S.peerTop}>
            <div style={S.peerAvatar}>{u.avatar}</div>
            <div style={S.peerInfo}>
              <div style={S.peerName}>{u.name}</div>
              <div style={S.peerCareer}>{u.career}</div>
              <div style={S.peerRegion}>📍 {u.region} · {u.age}</div>
            </div>
            {personality && <div style={S.scoreRing}>{u.score}%</div>}
          </div>
          <div style={S.peerTravel}>
            <span style={S.travelBadge}>{u.personality.travel}</span>
            <span style={S.travelBadge}>{u.personality.interest}</span>
          </div>
          <div style={S.peerTrips}>
            <div style={S.tripRow}><span style={S.tripIcon}>🗺️</span><span style={S.tripText}>최근: {u.recentTrip}</span></div>
            <div style={S.tripRow}><span style={S.tripIcon}>📅</span><span style={S.tripText}>예정: {u.nextPlan}</span></div>
          </div>
          <div style={S.peerTags}>{u.tags.map((t, i) => <span key={i} style={S.tag}>#{t}</span>)}</div>
          <button style={S.connectBtn} onClick={() => onChat(`${u.name}과 연결하고 싶어요`)}>
            함께 여행하고 싶어요 →
          </button>
        </div>
      ))}
    </div>
  );
}

// ── 여행 모임 페이지 ──────────────────────────────
function TravelPage({ personality, onChat }) {
  const groups = personality ? matchGroups(personality) : TRAVEL_GROUPS.slice(0, 4);
  return (
    <div style={S.page}>
      <div style={S.travelHero}>
        <div style={S.travelHeroText}>다음 여행은<br />함께 가요 ✈️</div>
        <div style={S.travelHeroSub}>{personality ? `${personality.travel} 스타일에 맞는 모임` : "맞춤 여행 모임 추천"}</div>
        <button style={S.createBtn} onClick={() => onChat("새 여행 모임 만들고 싶어요")}>
          + 모임 만들기
        </button>
      </div>
      {groups.map(g => (
        <div key={g.id} style={S.groupCard}>
          <div style={S.groupTop}>
            <div style={S.groupEmoji}>{g.image}</div>
            <div style={S.groupInfo}>
              <div style={S.groupTitle}>{g.title}</div>
              <div style={S.groupLeader}>주최: {g.leader}</div>
            </div>
          </div>
          <div style={S.groupMeta}>
            <div style={S.metaItem}><span>📅</span><span>{g.date}</span></div>
            <div style={S.metaItem}><span>👥</span><span>{g.members}/{g.maxMembers}명</span></div>
            <div style={S.metaItem}><span>💰</span><span>{g.cost}</span></div>
          </div>
          <div style={S.groupTags}>{g.tags.map((t, i) => <span key={i} style={S.tag}>#{t}</span>)}</div>
          <div style={S.memberBar}>
            <div style={S.memberBarFill} data-width={`${(g.members / g.maxMembers) * 100}%`} />
          </div>
          <button style={{ ...S.joinBtn, opacity: g.members >= g.maxMembers ? 0.5 : 1 }}
            onClick={() => onChat(`${g.title} 모임에 참여하고 싶어요`)}
            disabled={g.members >= g.maxMembers}>
            {g.members >= g.maxMembers ? "모집 완료" : "참여 신청하기"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── 성향 프로필 페이지 ────────────────────────────
function ProfilePage({ profile, personality, bucketList }) {
  const ICONS = { "액티브 탐험가": "🧗", "문화·역사 탐방": "🏛️", "미식 여행": "🍽️", "휴양·힐링": "🌊" };
  return (
    <div style={S.page}>
      <div style={S.profileHero}>
        <div style={S.profileHeroIcon}>{personality ? (ICONS[personality.travel] || "✨") : "🌸"}</div>
        <div style={S.profileHeroName}>{profile.name || "나"}님의 성향</div>
        {personality?.summary && <div style={S.profileHeroSub}>{personality.summary}</div>}
      </div>

      {personality ? (
        <>
          <div style={S.dimCard}>
            {Object.entries(PERSONALITY_DIMS).map(([key, dim]) => (
              <div key={key} style={S.dimRow}>
                <div style={S.dimLabel}>{dim.label}</div>
                <div style={S.dimOptions}>
                  {dim.options.map(opt => (
                    <span key={opt} style={{ ...S.dimOption, ...(personality[key] === opt ? S.dimOptionOn : {}) }}>
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={S.compatNote}>
            <div style={S.compatTitle}>🤝 잘 맞는 여행 스타일</div>
            <div style={S.compatText}>비슷한 성향의 분들과 연결되면 여행이 훨씬 즐거워져요. '비슷한 분들' 탭에서 확인해보세요!</div>
          </div>
        </>
      ) : (
        <div style={S.noPersonalityCard}>
          <div style={S.noPerIcon}>💬</div>
          <div style={S.noPerTitle}>아직 성향 분석 전이에요</div>
          <div style={S.noPerSub}>다솜이와 여행, 취미, 관심사 이야기를 나눠보세요. 자연스럽게 나만의 성향이 만들어져요.</div>
        </div>
      )}

      {profile.career && (
        <div style={S.careerCard}>
          <div style={S.careerTitle}>💼 나의 경험</div>
          <div style={S.careerText}>{profile.career}</div>
          {profile.region && <div style={S.careerSub}>📍 {profile.region}</div>}
        </div>
      )}
    </div>
  );
}

// ── 메시지 ────────────────────────────────────────
function MsgRow({ msg, onSend }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {msg.role === "user" ? (
        <div style={S.uRow}>
          <div style={S.uTime}>{msg.time}</div>
          <div style={S.uBubble}>{msg.content}</div>
        </div>
      ) : (
        <div style={S.bRow}>
          <div style={S.bAvatar}>🌸</div>
          <div style={S.bCol}>
            <div style={S.bName}>다솜</div>
            {msg.content && <div style={S.bBubble}>{msg.content.split("\n").map((l, i, a) => <span key={i}>{l}{i < a.length - 1 && <br />}</span>)}</div>}
            {msg.ui?.map((b, i) => <UIBlock key={i} block={b} onSend={onSend} />)}
            {msg.time && <div style={S.bTime}>{msg.time}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── UI 블록 ────────────────────────────────────────
function UIBlock({ block, onSend }) {
  if (block.type === "personality_result") return (
    <div style={S.personCard}>
      <div style={S.personTitle}>✨ 성향 분석 완료!</div>
      <div style={S.personSummary}>{block.personality.summary}</div>
      <div style={S.personGrid}>
        {[["여행", block.personality.travel], ["에너지", block.personality.energy], ["관심사", block.personality.interest], ["동행", block.personality.group]].map(([k, v]) => v && (
          <div key={k} style={S.personItem}><div style={S.personKey}>{k}</div><div style={S.personVal}>{v}</div></div>
        ))}
      </div>
      <button style={S.meetBtn} onClick={() => onSend("비슷한 분들 소개해줘요")}>비슷한 분들 만나보기 →</button>
    </div>
  );

  if (block.type === "peers") return (
    <div style={S.peersInline}>
      {block.users.slice(0, 2).map(u => (
        <div key={u.id} style={S.peerInlineCard}>
          <span style={S.peerInlineAvatar}>{u.avatar}</span>
          <div style={S.peerInlineInfo}>
            <div style={S.peerInlineName}>{u.name}</div>
            <div style={S.peerInlineSub}>{u.personality.travel} · {u.personality.interest}</div>
          </div>
          {block.hasPersonality && <div style={S.scoreSmall}>{u.score}%</div>}
        </div>
      ))}
      <button style={S.seeAllBtn} onClick={() => onSend("더 많은 분들 보고 싶어요")}>전체 보기 →</button>
    </div>
  );

  if (block.type === "travel_groups") return (
    <div style={S.groupsInline}>
      {block.groups.slice(0, 2).map(g => (
        <div key={g.id} style={S.groupInlineCard}>
          <span style={S.groupInlineEmoji}>{g.image}</span>
          <div style={S.groupInlineInfo}>
            <div style={S.groupInlineTitle}>{g.title}</div>
            <div style={S.groupInlineSub}>{g.date} · {g.members}/{g.maxMembers}명</div>
          </div>
          <button style={S.joinSmall} onClick={() => onSend(`${g.title} 참여하고 싶어요`)}>신청</button>
        </div>
      ))}
    </div>
  );

  if (block.type === "group_created") return (
    <div style={S.createdCard}>
      <div style={S.createdIcon}>🎉</div>
      <div>
        <div style={S.createdTitle}>모임이 만들어졌어요!</div>
        <div style={S.createdName}>"{block.group.title}"</div>
        <div style={S.createdSub}>{block.group.destination} · {block.group.date}</div>
      </div>
    </div>
  );

  if (block.type === "jobs") return (
    <div style={S.jobsInline}>
      {block.jobs.map((j, i) => (
        <div key={i} style={S.jobInlineCard}>
          <span>{j.badge}</span>
          <div style={S.jobInlineInfo}>
            <div style={S.jobInlineTitle}>{j.title}</div>
            <div style={S.jobInlineSub}>{j.pay}</div>
          </div>
        </div>
      ))}
    </div>
  );

  if (block.type === "bucket_added") return (
    <div style={S.successBadge}>🪣 버킷리스트 추가: "{block.item.item}"</div>
  );

  return null;
}

function TypingRow() {
  return (
    <div style={S.bRow}>
      <div style={S.bAvatar}>🌸</div>
      <div style={{ ...S.bBubble, padding: "12px 18px" }}>
        <span style={{ color: C.primary, letterSpacing: 4, fontSize: 18 }}>● ● ●</span>
      </div>
    </div>
  );
}

function InputBar({ input, setInput, onSend, loading }) {
  return (
    <div style={S.inputBar}>
      <input style={S.input} value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onSend(input)}
        placeholder="여행, 취미, 관심사 이야기 해주세요..." />
      <button style={{ ...S.sendBtn, opacity: (!input.trim() || loading) ? 0.3 : 1 }}
        onClick={() => onSend(input)} disabled={!input.trim() || loading}>↑</button>
    </div>
  );
}

function Splash() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: C.bg, gap: 16 }}>
      <div style={{ fontSize: 56 }}>🌸</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>다솜</div>
      <div style={{ fontSize: 14, color: C.sub }}>인생 2막, 함께해요</div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════
const C = { primary: "#B5614A", light: "#FAF7F4", accent: "#E8957E", bg: "#F5F0EA", text: "#2C2C2C", sub: "#8A8A8A", border: "#EAE4DC", warm: "#FDF6F0" };

const S = {
  root: { fontFamily: "'Noto Sans KR','Apple SD Gothic Neo',sans-serif", background: C.bg, minHeight: "100vh", maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", boxShadow: "0 0 60px rgba(0,0,0,0.08)" },

  header: { background: C.warm, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 20 },
  hLeft: { display: "flex", alignItems: "center", gap: 10 },
  logo: { width: 38, height: 38, background: `linear-gradient(135deg, ${C.accent}, ${C.primary})`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  appName: { fontSize: 17, fontWeight: 800, color: C.text },
  appSub: { fontSize: 11, color: C.sub, marginTop: 1 },
  personalityChip: { background: `${C.primary}15`, color: C.primary, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 },

  nav: { display: "flex", background: "#fff", borderTop: `1px solid ${C.border}` },
  navBtn: { flex: 1, border: "none", background: "transparent", padding: "10px 4px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "inherit", position: "relative" },
  navOn: { color: C.primary },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 10, fontWeight: 700, color: "inherit" },
  navTip: { position: "absolute", top: 4, right: 4, background: "#EEE", color: "#999", fontSize: 8, padding: "1px 4px", borderRadius: 4 },

  chat: { flex: 1, overflowY: "auto", padding: "16px 14px 8px" },
  quickWrap: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  quickBtn: { background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#555", cursor: "pointer", fontFamily: "inherit" },

  bRow: { display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 4 },
  bAvatar: { width: 36, height: 36, background: `linear-gradient(135deg, ${C.accent}, ${C.primary})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 },
  bCol: { display: "flex", flexDirection: "column", gap: 6, maxWidth: "84%" },
  bName: { fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 2 },
  bBubble: { background: "#fff", padding: "12px 16px", borderRadius: "4px 16px 16px 16px", fontSize: 15, lineHeight: 1.75, color: C.text, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" },
  bTime: { fontSize: 10, color: "#CCC" },
  uRow: { display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 8 },
  uTime: { fontSize: 10, color: "#CCC" },
  uBubble: { background: `linear-gradient(135deg, ${C.primary}, #8B3E2B)`, color: "#fff", padding: "12px 16px", borderRadius: "16px 16px 4px 16px", fontSize: 15, lineHeight: 1.75, maxWidth: "75%", boxShadow: `0 2px 14px rgba(181,97,74,0.3)` },

  inputBar: { display: "flex", gap: 10, padding: "12px 14px", background: "#fff", borderTop: `1px solid ${C.border}` },
  input: { flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 24, padding: "11px 18px", fontSize: 15, fontFamily: "inherit", outline: "none", background: C.warm },
  sendBtn: { width: 44, height: 44, background: `linear-gradient(135deg, ${C.primary}, #8B3E2B)`, border: "none", borderRadius: "50%", color: "#fff", fontSize: 20, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "opacity 0.2s" },

  page: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 },

  tipCard: { background: "#FFF9E6", borderRadius: 14, padding: 16, display: "flex", alignItems: "flex-start", gap: 12, border: "1px solid #FFE082" },
  tipIcon: { fontSize: 28 },
  tipTitle: { fontSize: 14, fontWeight: 800, color: "#795548", marginBottom: 4 },
  tipSub: { fontSize: 13, color: "#9E9E9E", lineHeight: 1.6 },

  matchHeader: { padding: "4px 0" },
  matchTitle: { fontSize: 18, fontWeight: 800, color: C.text },
  matchSub: { fontSize: 13, color: C.sub, marginTop: 4 },

  peerCard: { background: "#fff", borderRadius: 18, padding: 18, boxShadow: "0 2px 14px rgba(0,0,0,0.06)" },
  peerTop: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  peerAvatar: { width: 52, height: 52, background: `linear-gradient(135deg, ${C.accent}40, ${C.primary}40)`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 },
  peerInfo: { flex: 1 },
  peerName: { fontSize: 16, fontWeight: 800, color: C.text },
  peerCareer: { fontSize: 12, color: C.sub, marginTop: 3, lineHeight: 1.5 },
  peerRegion: { fontSize: 12, color: C.sub, marginTop: 2 },
  scoreRing: { background: `linear-gradient(135deg, ${C.accent}, ${C.primary})`, color: "#fff", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 },
  peerTravel: { display: "flex", gap: 6, marginBottom: 10 },
  travelBadge: { background: `${C.primary}15`, color: C.primary, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  peerTrips: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 10, background: C.bg, borderRadius: 10, padding: "10px 12px" },
  tripRow: { display: "flex", alignItems: "center", gap: 8 },
  tripIcon: { fontSize: 14 },
  tripText: { fontSize: 13, color: C.text },
  peerTags: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  tag: { background: "#F5F5F5", color: "#666", padding: "3px 10px", borderRadius: 8, fontSize: 12 },
  connectBtn: { width: "100%", background: C.warm, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 700, color: C.primary, cursor: "pointer", fontFamily: "inherit" },

  travelHero: { background: `linear-gradient(135deg, #2D3561, #1A1A2E)`, borderRadius: 20, padding: "24px 20px", color: "#fff" },
  travelHeroText: { fontSize: 22, fontWeight: 800, lineHeight: 1.3, marginBottom: 8 },
  travelHeroSub: { fontSize: 13, opacity: 0.7, marginBottom: 16 },
  createBtn: { background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  groupCard: { background: "#fff", borderRadius: 18, padding: 18, boxShadow: "0 2px 14px rgba(0,0,0,0.06)" },
  groupTop: { display: "flex", gap: 14, marginBottom: 14 },
  groupEmoji: { width: 52, height: 52, background: C.bg, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 },
  groupInfo: { flex: 1 },
  groupTitle: { fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.3 },
  groupLeader: { fontSize: 12, color: C.sub, marginTop: 4 },
  groupMeta: { display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" },
  metaItem: { display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#555" },
  groupTags: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  memberBar: { height: 4, background: "#EEE", borderRadius: 2, marginBottom: 12, overflow: "hidden" },
  memberBarFill: { height: "100%", background: `linear-gradient(90deg, ${C.accent}, ${C.primary})`, borderRadius: 2, width: "60%" },
  joinBtn: { width: "100%", background: `linear-gradient(135deg, ${C.primary}, #8B3E2B)`, color: "#fff", border: "none", borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  profileHero: { background: `linear-gradient(135deg, ${C.accent}, ${C.primary})`, borderRadius: 20, padding: "28px 20px", textAlign: "center", color: "#fff" },
  profileHeroIcon: { fontSize: 52, marginBottom: 8 },
  profileHeroName: { fontSize: 20, fontWeight: 800, marginBottom: 6 },
  profileHeroSub: { fontSize: 14, opacity: 0.85 },

  dimCard: { background: "#fff", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14 },
  dimRow: { display: "flex", flexDirection: "column", gap: 8 },
  dimLabel: { fontSize: 12, fontWeight: 700, color: C.sub },
  dimOptions: { display: "flex", gap: 6, flexWrap: "wrap" },
  dimOption: { padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "#F5F5F5", color: "#999" },
  dimOptionOn: { background: `${C.primary}20`, color: C.primary, border: `1px solid ${C.primary}40` },

  compatNote: { background: "#E8F5E9", borderRadius: 14, padding: 16 },
  compatTitle: { fontSize: 14, fontWeight: 800, color: "#2E7D32", marginBottom: 6 },
  compatText: { fontSize: 13, color: "#558B2F", lineHeight: 1.6 },

  noPersonalityCard: { background: "#fff", borderRadius: 16, padding: 28, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 },
  noPerIcon: { fontSize: 48 },
  noPerTitle: { fontSize: 17, fontWeight: 800, color: C.text },
  noPerSub: { fontSize: 14, color: C.sub, lineHeight: 1.7 },

  careerCard: { background: "#fff", borderRadius: 16, padding: 18 },
  careerTitle: { fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8 },
  careerText: { fontSize: 14, color: "#555", lineHeight: 1.6 },
  careerSub: { fontSize: 12, color: C.sub, marginTop: 6 },

  // 인라인 UI 블록
  personCard: { background: `linear-gradient(135deg, ${C.warm}, #fff)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 },
  personTitle: { fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 },
  personSummary: { fontSize: 14, color: C.primary, fontWeight: 700, marginBottom: 12, padding: "6px 12px", background: `${C.primary}10`, borderRadius: 10 },
  personGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 },
  personItem: { background: C.bg, borderRadius: 10, padding: "8px 10px" },
  personKey: { fontSize: 10, color: C.sub, marginBottom: 3 },
  personVal: { fontSize: 13, fontWeight: 700, color: C.text },
  meetBtn: { width: "100%", background: `linear-gradient(135deg, ${C.primary}, #8B3E2B)`, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  peersInline: { display: "flex", flexDirection: "column", gap: 8 },
  peerInlineCard: { background: "#fff", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${C.border}` },
  peerInlineAvatar: { fontSize: 28 },
  peerInlineInfo: { flex: 1 },
  peerInlineName: { fontSize: 14, fontWeight: 700, color: C.text },
  peerInlineSub: { fontSize: 12, color: C.sub },
  scoreSmall: { background: `${C.primary}20`, color: C.primary, borderRadius: 10, padding: "3px 8px", fontSize: 12, fontWeight: 800 },
  seeAllBtn: { background: C.warm, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, color: C.primary, cursor: "pointer", fontFamily: "inherit", width: "100%" },

  groupsInline: { display: "flex", flexDirection: "column", gap: 8 },
  groupInlineCard: { background: "#fff", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.border}` },
  groupInlineEmoji: { fontSize: 28 },
  groupInlineInfo: { flex: 1 },
  groupInlineTitle: { fontSize: 13, fontWeight: 700, color: C.text },
  groupInlineSub: { fontSize: 11, color: C.sub },
  joinSmall: { background: `${C.primary}`, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },

  createdCard: { background: "#E8F5E9", borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 12, border: "1px solid #C8EAC8" },
  createdIcon: { fontSize: 32 },
  createdTitle: { fontSize: 14, fontWeight: 800, color: "#2E7D32" },
  createdName: { fontSize: 13, color: "#2E7D32", fontWeight: 600 },
  createdSub: { fontSize: 12, color: "#558B2F" },

  jobsInline: { display: "flex", flexDirection: "column", gap: 8 },
  jobInlineCard: { background: "#fff", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.border}` },
  jobInlineInfo: { flex: 1 },
  jobInlineTitle: { fontSize: 13, fontWeight: 700, color: C.text },
  jobInlineSub: { fontSize: 12, color: C.primary },

  successBadge: { background: "#F0FBF0", border: "1px solid #C8EAC8", borderRadius: 10, padding: "8px 14px", fontSize: 13, color: "#2E7D32", fontWeight: 600 },
};
