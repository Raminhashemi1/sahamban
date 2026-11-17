package ir.myket.billingclient.util;
public final class Purchase {
 private final String sku,payload,json,signature,token; private final int state;
 public Purchase(String sku,int state,String payload,String json,String signature,String token){
  this.sku=sku;this.state=state;this.payload=payload;this.json=json;this.signature=signature;this.token=token;
 }
 public String getSku(){return sku;} public int getPurchaseState(){return state;}
 public String getDeveloperPayload(){return payload;} public String getOriginalJson(){return json;}
 public String getSignature(){return signature;} public String getToken(){return token;}
}