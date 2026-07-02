import asyncio
from sarvamai import AsyncSarvamAI

async def test_stt():
    client = AsyncSarvamAI(api_subscription_key="sk_jhefvphs_618dxXbU2T2SrIIJsrNVYA1M")
    with open("test.wav", "rb") as f:
        audio = f.read()
    try:
        res = await client.speech_to_text.translate(file=audio)
        print("Success:", res)
    except Exception as e:
        print("Error:", e)

asyncio.run(test_stt())
