import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const data = await pdf(Buffer.from(buffer));

    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return NextResponse.json({ error: 'Failed to extract text from PDF' }, { status: 500 });
  }
}
