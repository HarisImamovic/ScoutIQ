from google import genai
c = genai.Client(api_key='AIzaSyDpUUdykA-ob3VYvRRwzxZTeh5fQ9XYwNU')
[print(m.name) for m in c.models.list()]