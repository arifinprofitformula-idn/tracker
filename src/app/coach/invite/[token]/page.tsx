import CoachInviteConsent from "@/components/CoachInviteConsent";

export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <CoachInviteConsent token={token}/>}
