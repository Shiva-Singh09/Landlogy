// TextBee SMS (SMS only; never expose TEXTBEE_API). Fire-and-forget — failures never affect email results.
export const sendTextBeeSms=async(phone,message)=>{
  const key=process.env.TEXTBEE_API;
  if(!key) return {sent:false,skipped:'no-api-key'};
  try{
    const res=await fetch('https://api.textbee.dev/api/v1/gateway/send-sms',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key},body:JSON.stringify({recipients:[phone],message})});
    if(!res.ok){
      let body='';
      try{body=await res.text()}catch{}
      console.error('[SMS] TextBee send failed:',{status:res.status,body:body.slice(0,200)});
      return {sent:false};
    }
    return {sent:true};
  }catch(err){
    console.error('[SMS] TextBee request error:',err?.message||err);
    return {sent:false};
  }
};
