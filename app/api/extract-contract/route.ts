import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { base64, mediaType } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: `Extract contract salary data from this MLS MLSPA deal summary PDF.

2027 IMPORTANT: In 2027 there is a Sprint Season (Jan 1 to Jun 30) and a Regular Season (Jul 1 to Dec 31). Some players have different salaries for each half; many have the same salary for the full calendar year.
- If the contract shows ONE salary for all of 2027: put it under 2027s only. Do NOT create a 2027r key.
- If the contract shows TWO different salaries for 2027: put the Sprint amount under 2027s and the Regular amount under 2027r.

Return ONLY raw JSON, no markdown:
{"name":"Player full name","club":"club or empty string","position":"GK or DEF or MID or FWD","contractType":"Guaranteed or Option or Loan","structure":"e.g. 2.9+1.0+1.0","activeDate":"YYYY-MM-DD","guaranteeEnd":"YYYY-MM-DD","salaries":{"2026":264706,"2027s":250000,"2028":250000,"2029":300000},"monthlies":{"2026":22058,"2027s":20833,"2028":20833}}
Only include years and periods present in the document. Raw JSON only.`
            }
          ]
        }]
      })
    })

    const data = await response.json()
    const text = data.content.map((b: any) => b.text || '').join('')
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json(parsed)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
