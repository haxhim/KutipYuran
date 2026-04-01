import { NextRequest, NextResponse } from "next/server";
import { uploadManualPaymentProof } from "@/modules/payments/manual-proof.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ billingId: string }> }) {
  const { billingId } = await params;
  const formData = await request.formData();
  const file = formData.get("proof");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Proof file is required" }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await uploadManualPaymentProof({
      billingRecordId: billingId,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      bytes: new Uint8Array(arrayBuffer),
    });

    return NextResponse.json({
      ok: true,
      proofId: result.proof.id,
      transactionId: result.transactionId,
      referenceNo: result.referenceNo,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload payment proof" },
      { status: 400 },
    );
  }
}
