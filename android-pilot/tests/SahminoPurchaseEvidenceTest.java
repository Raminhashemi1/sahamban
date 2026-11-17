package ir.sahamban.pilot;
import ir.myket.billingclient.util.Purchase;
public final class SahminoPurchaseEvidenceTest {
 public static void main(String[] args) {
  Purchase valid=new Purchase("sahmino_pro_30d",0,"payload","{\"productId\":\"sahmino_pro_30d\"}","signed","token");
  SahminoPurchaseEvidence e=SahminoPurchaseEvidence.from(valid);
  if(e==null||!e.sku.equals("sahmino_pro_30d")||!e.signature.equals("signed")||!e.originalJson.contains("productId"))throw new AssertionError("valid evidence");
  if(SahminoPurchaseEvidence.from(null)!=null)throw new AssertionError("null purchase");
  if(SahminoPurchaseEvidence.from(new Purchase("sku",1,"p","json","sig","t"))!=null)throw new AssertionError("unpaid state");
  if(SahminoPurchaseEvidence.from(new Purchase("sku",0,"p","","sig","t"))!=null)throw new AssertionError("missing original json");
  if(SahminoPurchaseEvidence.from(new Purchase("sku",0,"p","json","","t"))!=null)throw new AssertionError("missing signature");
  System.out.println("SahminoPurchaseEvidenceTest: PASS");
 }
}