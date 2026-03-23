import os
import boto3
import logging
from botocore.client import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class R2Client:
    """
    Cloudflare R2 storage client using S3-compatible API
    """

    def __init__(self):
        self.account_id = os.getenv('R2_ACCOUNT_ID')
        self.access_key_id = os.getenv('R2_ACCESS_KEY_ID')
        self.secret_access_key = os.getenv('R2_SECRET_ACCESS_KEY')
        self.bucket_name = os.getenv('R2_BUCKET_NAME', 'wallfeel-uploads')

        if not all([self.account_id, self.access_key_id, self.secret_access_key]):
            raise ValueError("R2 credentials not configured. Check .env file.")

        # Create S3 client configured for R2
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{self.account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )

    def upload_file(self, file_data: bytes, filename: str, content_type: str = 'image/jpeg') -> str:
        """
        Upload file to R2 bucket

        Args:
            file_data: File content as bytes
            filename: Name for the file in R2
            content_type: MIME type of the file

        Returns:
            Public URL of the uploaded file
        """
        try:
            logger.info(f"Uploading file to R2: {filename}")

            # Upload to R2
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=file_data,
                ContentType=content_type
            )

            # Generate public URL
            # Format: https://pub-{account_id}.r2.dev/{filename}
            # Note: This requires R2 bucket to have public access enabled
            public_url = f"https://pub-{self.account_id}.r2.dev/{filename}"

            logger.info(f"File uploaded successfully: {public_url}")
            return public_url

        except ClientError as e:
            logger.error(f"R2 upload failed: {str(e)}", exc_info=True)
            raise Exception(f"Failed to upload to R2: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during upload: {str(e)}", exc_info=True)
            raise Exception(f"Failed to upload to R2: {str(e)}")

    def delete_file(self, filename: str) -> bool:
        """
        Delete file from R2 bucket

        Args:
            filename: Name of the file to delete

        Returns:
            True if successful
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=filename
            )
            return True
        except Exception as e:
            raise Exception(f"Failed to delete from R2: {str(e)}")

    def file_exists(self, filename: str) -> bool:
        """
        Check if file exists in R2 bucket

        Args:
            filename: Name of the file to check

        Returns:
            True if file exists
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=filename
            )
            return True
        except:
            return False

# Create singleton instance
r2_client = R2Client()
