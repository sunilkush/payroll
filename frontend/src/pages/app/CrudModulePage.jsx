import { Card, Table, Alert } from "antd";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { asyncActions } from "../../app/store";
export default function CrudModulePage({ title, slice, columns=[{title:"Name",dataIndex:"name"}] }){ const d=useDispatch(); const st=useSelector(s=>s[slice]); useEffect(()=>{d(asyncActions[slice].fetchList());},[d,slice]); return <Card title={title}>{st.error && <Alert type="error" message={st.error} />}<Table rowKey={(r)=>r.id||r._id||JSON.stringify(r)} loading={st.loading} dataSource={st.items} columns={columns} pagination={{total:st.meta?.total||0}}/></Card>}
