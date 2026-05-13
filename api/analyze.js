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
아래 [심사기준]을 바탕으로 [검토대상] 계약 내용을 분석하고, 부당특약에 해당하는 항목을 찾아 JSON으로만 응답하세요.

[심사기준]
유형1 - 서면 미기재 사항 비용 전가 (법 제3조의4 제2항 제1호): 하도급계약 서면에 없는 사항을 현장설명서 등에만 기재하고 비용 전가
유형2 - 민원처리·산업재해 비용 전가 (법 제3조의4 제2항 제2호): 원사업자 부담 민원처리비·산재비를 수급사업자에 전가, 추가금액·기간연장 청구 금지
유형3 - 입찰내역 미반영 사항 비용 전가 (법 제3조의4 제2항 제3호): 산출내역서에 없는 사항 비용 전가, "모든 비용 포함" 간주, 추가비용 청구 완전 금지
유형4 - 원사업자 법정 의무비용 전가 (영 제6조의4 제1호): 인허가·환경관리·품질관리 비용, 설계변경·재작업·보수작업 비용, 하자담보책임 전가
유형5 - 불가항력 비용 전가 (영 제6조의4 제2호): 천재지변·전염병·파업·해킹 등 예측불가 사유 비용을 수급사업자에 전가
유형6 - 간접비 일률 제한 (영 제6조의4 제3호): 거래 특성 무관하게 일반관리비·이윤·안전관리비 등을 일률적으로 제한
유형7 - 하도급대금 조정 권리 제한 (영 제6조의4 제4호): 원재료 가격변동 조정 신청권 박탈, 증액 요구 완전 금지
유형8 - 수급사업자 법적 권리 제한 (고시 제1호): 위탁내용 확인 요청권, 공정위 신고권, 대금수령권 제한
유형9 - 정보·지재권 귀속 불균형 (고시 제2호): 수급사업자 취득 지식재산권 무상 귀속, 비밀준수의무 일방 부과
유형10 - 계약이행보증 부당약정 (고시 제3호): 보증금 10% 초과 요구, 대표이사 개인 연대보증
유형11 - 검사비용·이의제기 제한 (고시 제4호): 최초 검사비용 수급사업자 전가, 검사결과 이의제기 금지
유형12 - 계약해석·해제 불균형 (고시 제5호): 원사업자 일방적 계약해석권, 손배·하자담보 책임 가중, 자재 멸실 책임 전가

[위험도 기준]
- critical: 법령상 명백한 위반, 과태료·시정명령 가능성 높음
- high: 심사지침 부당특약 예시와 직접 부합
- medium: 부당특약 가능성, 추가 검토 필요
- low: 표현 불명확, 개선 권고 수준

[검토대상]
${content.slice(0, 8000)}

반드시 아래 JSON만 반환하세요. 마크다운 없이 순수 JSON만:
{
  "results": [
    {
      "original_text": "원문에서 문제가 되는 실제 문구",
      "law_ref": "관련 조항",
      "violation_type": "위반 유형명 (20자 이내)",
      "reason": "위반 사유 및 관련 지침 근거 (100자 이내)",
      "risk": "critical 또는 high 또는 medium 또는 low",
      "recommendation": "수정 권고 문구 또는 조치 방향 (100자 이내)"
    }
  ]
}
위반 사항이 없으면: {"results":[]}`;

  try {
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
      })
    });

    const data = await geminiRes.json();
    if (!geminiRes.ok) throw new Error(data.error?.message || 'Gemini API 오류');

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
