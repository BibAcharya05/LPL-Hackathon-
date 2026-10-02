import boto3
from botocore.config import Config

client = boto3.client(
    "bedrock-runtime",
    region_name="us-east-1",
    config=Config(
        retries={"total_max_attempts": 1},
        connect_timeout=10,
        read_timeout=60,
    ),
)

response = client.converse(
    modelId="amazon.nova-micro-v1:0",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "text": (
                        "Summarize this synthetic demo finding in one sentence: "
                        "Priya Shah's Roth IRA transition packet is missing "
                        "the beneficiary designation required by our demo "
                        "checklist. Human review is required. "
                        "Do not add facts or authorize a transfer."
                    )
                }
            ],
        }
    ],
    inferenceConfig={
        "maxTokens": 150,
        "temperature": 0,
    },
)

for content in response["output"]["message"]["content"]:
    if "text" in content:
        print(content["text"])