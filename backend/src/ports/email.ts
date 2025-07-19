import { Result } from "neverthrow";
import { InfrastructureError } from "../error.js";

export interface AttachedFile {
  filename: string;
  data: Blob;
}

export interface SendEmailRequest {
  sender: string;
  receiver?: string;
  subject: string;
  paragraphs?: string[];
  html?: string;
  attachments?: AttachedFile[];
  bcc?: string;
}

export interface EmailService {
  sendEmail(req: SendEmailRequest): Promise<Result<void, InfrastructureError>>;
}
