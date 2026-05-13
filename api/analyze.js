export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: '내용을 입력해주세요.' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `당신은 대한민국 공정거래위원회의 부당특약 심사지침(예규 제485호, 2025.5.1. 시행) 전문가입니다.
아래 심사기준을 바탕으로 계약 내용을 분석하고 부당특약 해당 항목을 찾아 JSON으로만 응답하세요.

심사기준:
유형1 - 서면 미기재 사항 비용 전가 (법 제3조의4 제2항 제1호)
유형2 - 민원처리 산업재해 비용 전가 (법 제3조의4 제2항 제2호)
유형3 - 입찰내역 미반영 사항 비용 전가 (법 제3조의4 제2항 제3호)
유형4 - 원사업자 법정 의무비용 전가 (영 제6조의4 제1호)
유형5 - 불가항력 비용 전가 (영 제6조의4 제2호)
유형6 - 간접비 일률 제한 (영 제6조의4 제3호)
유형7 - 하도급대금 조정 권리 제한 (영 제6조의4 제4호)
유형8 - 수급사업자 법적 권리 제한 (고시 제1호)
유형9 - 정보 지재권 귀속 불균형 (고시 제2호)
유형10 - 계약이행보증 부당약정 (고시 제3호)
유형11 - 검사비용 이의제기 제한 (고시 제4호)
유형12 - 계약해석 해제 불균형 (고시 제5호)

위험도: critical(명백한 법령 위반), high(지침 예시와 부합), medium(추가검토 필요), low(개선 권고)

검토대상:
${content.slice(0, 6000)}

아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이:
{"results":[{"original_text":"문제 문구","law_ref":"관련 조항","violation_type":"위반 유형","reason":"위반 사유","risk":"critical또는high또는medium또는low","recommendation":"수정 권고"}]}
위반 없으면: {"results":[]}`;

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
      })
    });

    const data = await geminiRes.json();
    if (!geminiRes.ok) throw new Error(data.error?.message || 'Gemini API 오류');

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch(e) {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = { results: [] };
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
