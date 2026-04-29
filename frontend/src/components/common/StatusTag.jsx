import { Tag } from "antd";
const map={DRAFT:"default",CALCULATED:"blue",SUBMITTED:"purple",APPROVED:"green",REJECTED:"red",LOCKED:"gold",PAID:"cyan",ACTIVE:"green",INACTIVE:"default",EXITED:"red",ON_NOTICE:"orange"};
export default function StatusTag({status}){return <Tag color={map[status]||"default"}>{status}</Tag>;}
