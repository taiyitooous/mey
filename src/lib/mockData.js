import { subHours, subMinutes, subDays, addDays } from 'date-fns'

const now = new Date()

export const SELLERS = [
  { id: 's1', name: 'Ana Lima', seller_key: 'ana', avatar: null },
  { id: 's2', name: 'Bruno Costa', seller_key: 'bruno', avatar: null },
  { id: 's3', name: 'Carla Souza', seller_key: 'carla', avatar: null },
  { id: 's4', name: 'Diego Matos', seller_key: 'diego', avatar: null },
  { id: 's5', name: 'Elisa Rocha', seller_key: 'elisa', avatar: null },
]

export const EVENTS = [
  // Calls
  { id: 'e1', entity_type: 'lead', entity_id: 'l1', event_type: 'call_answered', user_name: 'Ana Lima', user_email: 'ana@mey.com', source: '3c', created_at: subMinutes(now, 3).toISOString(), payload: { speaking_time: 142, result: 'interested', call_id: 'c001' } },
  { id: 'e2', entity_type: 'lead', entity_id: 'l2', event_type: 'call_answered', user_name: 'Bruno Costa', user_email: 'bruno@mey.com', source: '3c', created_at: subMinutes(now, 8).toISOString(), payload: { speaking_time: 87, result: 'no_answer', call_id: 'c002' } },
  { id: 'e3', entity_type: 'lead', entity_id: 'l3', event_type: 'whatsapp_call_received', user_name: 'Carla Souza', user_email: 'carla@mey.com', source: 'whatsapp', created_at: subMinutes(now, 15).toISOString(), payload: { speaking_time: 203, call_id: 'w001' } },
  { id: 'e4', entity_type: 'lead', entity_id: 'l1', event_type: 'call_answered', user_name: 'Ana Lima', user_email: 'ana@mey.com', source: '3c', created_at: subMinutes(now, 25).toISOString(), payload: { speaking_time: 56, result: 'callback', call_id: 'c003' } },
  { id: 'e5', entity_type: 'lead', entity_id: 'l4', event_type: 'lead.won', user_name: 'Diego Matos', user_email: 'diego@mey.com', source: 'mey', created_at: subMinutes(now, 32).toISOString(), payload: { value: 890 } },
  { id: 'e6', entity_type: 'lead', entity_id: 'l5', event_type: 'call_answered', user_name: 'Elisa Rocha', user_email: 'elisa@mey.com', source: '3c', created_at: subMinutes(now, 41).toISOString(), payload: { speaking_time: 175, result: 'interested', call_id: 'c004' } },
  { id: 'e7', entity_type: 'lead', entity_id: 'l6', event_type: 'lead.won', user_name: 'Carla Souza', user_email: 'carla@mey.com', source: 'mey', created_at: subHours(now, 1).toISOString(), payload: { value: 1240 } },
  { id: 'e8', entity_type: 'lead', entity_id: 'l2', event_type: 'call_answered', user_name: 'Bruno Costa', user_email: 'bruno@mey.com', source: '3c', created_at: subHours(now, 1.5).toISOString(), payload: { speaking_time: 298, result: 'interested', call_id: 'c005' } },
  { id: 'e9', entity_type: 'lead', entity_id: 'l7', event_type: 'lead.lost', user_name: 'Ana Lima', user_email: 'ana@mey.com', source: 'mey', created_at: subHours(now, 2).toISOString(), payload: { reason: 'price' } },
  { id: 'e10', entity_type: 'lead', entity_id: 'l8', event_type: 'call_answered', user_name: 'Diego Matos', user_email: 'diego@mey.com', source: '3c', created_at: subHours(now, 2.2).toISOString(), payload: { speaking_time: 412, result: 'interested', call_id: 'c006' } },
  { id: 'e11', entity_type: 'lead', entity_id: 'l9', event_type: 'call_answered', user_name: 'Elisa Rocha', user_email: 'elisa@mey.com', source: '3c', created_at: subHours(now, 3).toISOString(), payload: { speaking_time: 63, result: 'no_answer', call_id: 'c007' } },
  { id: 'e12', entity_type: 'lead', entity_id: 'l3', event_type: 'lead.won', user_name: 'Bruno Costa', user_email: 'bruno@mey.com', source: 'mey', created_at: subHours(now, 3.5).toISOString(), payload: { value: 670 } },
]

export const LEADS = [
  { id: 'l1', name: 'Roberto Ferreira', phone: '(11) 98765-4321', stage: 1, seller_key: 'ana', source: 'datacrazy', created_at: subDays(now, 2).toISOString(), value: 0, tags: ['retorno'] },
  { id: 'l2', name: 'Mariana Oliveira', phone: '(21) 97654-3210', stage: 2, seller_key: 'bruno', source: 'datacrazy', created_at: subDays(now, 1).toISOString(), value: 0, tags: [] },
  { id: 'l3', name: 'Carlos Eduardo', phone: '(31) 96543-2109', stage: 5, seller_key: 'carla', source: 'datacrazy', created_at: subDays(now, 5).toISOString(), value: 1240, tags: ['ganho'] },
  { id: 'l4', name: 'Patricia Lima', phone: '(41) 95432-1098', stage: 5, seller_key: 'diego', source: 'datacrazy', created_at: subDays(now, 3).toISOString(), value: 890, tags: ['ganho'] },
  { id: 'l5', name: 'Fernando Santos', phone: '(51) 94321-0987', stage: 3, seller_key: 'elisa', source: 'datacrazy', created_at: subDays(now, 1).toISOString(), value: 0, tags: [] },
  { id: 'l6', name: 'Juliana Costa', phone: '(61) 93210-9876', stage: 5, seller_key: 'carla', source: 'datacrazy', created_at: subDays(now, 4).toISOString(), value: 670, tags: ['ganho'] },
  { id: 'l7', name: 'Marcos Ribeiro', phone: '(71) 92109-8765', stage: 0, seller_key: 'ana', source: 'datacrazy', created_at: subDays(now, 6).toISOString(), value: 0, tags: ['perdido'] },
  { id: 'l8', name: 'Camila Alves', phone: '(81) 91098-7654', stage: 4, seller_key: 'diego', source: 'datacrazy', created_at: subDays(now, 2).toISOString(), value: 0, tags: [] },
  { id: 'l9', name: 'Ricardo Pereira', phone: '(91) 90987-6543', stage: 2, seller_key: 'elisa', source: 'datacrazy', created_at: subDays(now, 1).toISOString(), value: 0, tags: [] },
  { id: 'l10', name: 'Vanessa Nunes', phone: '(11) 89876-5432', stage: 1, seller_key: 'bruno', source: 'datacrazy', created_at: subHours(now, 4).toISOString(), value: 0, tags: [] },
  { id: 'l11', name: 'Thiago Moraes', phone: '(21) 88765-4321', stage: 3, seller_key: 'ana', source: 'datacrazy', created_at: subDays(now, 2).toISOString(), value: 0, tags: [] },
  { id: 'l12', name: 'Sandra Duarte', phone: '(31) 87654-3210', stage: 4, seller_key: 'carla', source: 'datacrazy', created_at: subDays(now, 3).toISOString(), value: 0, tags: [] },
]

export const ORDERS = [
  { id: 'o1', lead_id: 'l3', customer_name: 'Carlos Eduardo', status: 'delivered', carrier: 'Correios', tracking_code: 'BR123456789', created_at: subDays(now, 4).toISOString(), updated_at: subDays(now, 1).toISOString(), value: 1240 },
  { id: 'o2', lead_id: 'l4', customer_name: 'Patricia Lima', status: 'in_transit', carrier: 'JadLog', tracking_code: 'JD987654321', created_at: subDays(now, 2).toISOString(), updated_at: subHours(now, 5).toISOString(), value: 890 },
  { id: 'o3', lead_id: 'l6', customer_name: 'Juliana Costa', status: 'out_for_delivery', carrier: 'Total Express', tracking_code: 'TE555444333', created_at: subDays(now, 3).toISOString(), updated_at: subHours(now, 2).toISOString(), value: 670 },
  { id: 'o4', lead_id: 'l8', customer_name: 'Camila Alves', status: 'processing', carrier: 'Correios', tracking_code: null, created_at: subHours(now, 6).toISOString(), updated_at: subHours(now, 6).toISOString(), value: 450 },
  { id: 'o5', lead_id: 'l5', customer_name: 'Fernando Santos', status: 'returned', carrier: 'JadLog', tracking_code: 'JD111222333', created_at: subDays(now, 7).toISOString(), updated_at: subDays(now, 1).toISOString(), value: 320 },
  { id: 'o6', lead_id: 'l11', customer_name: 'Thiago Moraes', status: 'in_transit', carrier: 'Total Express', tracking_code: 'TE999888777', created_at: subDays(now, 3).toISOString(), updated_at: subHours(now, 8).toISOString(), value: 780 },
]

export const COLLECTIONS = [
  { id: 'c1', customer_name: 'José Almeida', phone: '(11) 97777-6666', amount: 340, attempts: 3, status: 'pending', last_contact: subDays(now, 1).toISOString(), promise_date: addDays(now, 2).toISOString(), seller_key: 'ana', notes: 'Prometeu pagar na sexta' },
  { id: 'c2', customer_name: 'Maria Gonçalves', phone: '(21) 96666-5555', amount: 120, attempts: 1, status: 'contacted', last_contact: subHours(now, 3).toISOString(), promise_date: null, seller_key: 'bruno', notes: '' },
  { id: 'c3', customer_name: 'Paulo Correia', phone: '(31) 95555-4444', amount: 890, attempts: 5, status: 'agreement', last_contact: subDays(now, 2).toISOString(), promise_date: addDays(now, 5).toISOString(), seller_key: 'carla', notes: 'Parcelado em 3x' },
  { id: 'c4', customer_name: 'Ana Beatriz', phone: '(41) 94444-3333', amount: 250, attempts: 2, status: 'pending', last_contact: subDays(now, 3).toISOString(), promise_date: null, seller_key: 'diego', notes: '' },
  { id: 'c5', customer_name: 'Roberto Silva', phone: '(51) 93333-2222', amount: 670, attempts: 0, status: 'new', last_contact: null, promise_date: null, seller_key: 'elisa', notes: '' },
  { id: 'c6', customer_name: 'Lucia Martins', phone: '(61) 92222-1111', amount: 180, attempts: 4, status: 'paid', last_contact: subHours(now, 1).toISOString(), promise_date: null, seller_key: 'ana', notes: 'Quitado' },
]

export const TASKS = [
  { id: 't1', title: 'Ligar para Roberto Ferreira', type: 'call', seller_key: 'ana', lead_id: 'l1', due_date: now.toISOString(), done: false, priority: 'high' },
  { id: 't2', title: 'Enviar proposta para Camila Alves', type: 'message', seller_key: 'diego', lead_id: 'l8', due_date: now.toISOString(), done: false, priority: 'medium' },
  { id: 't3', title: 'Follow-up Fernando Santos', type: 'call', seller_key: 'elisa', lead_id: 'l5', due_date: now.toISOString(), done: true, priority: 'low' },
  { id: 't4', title: 'Confirmar entrega Patricia Lima', type: 'check', seller_key: 'diego', lead_id: 'l4', due_date: now.toISOString(), done: false, priority: 'high' },
  { id: 't5', title: 'WhatsApp Vanessa Nunes', type: 'message', seller_key: 'bruno', lead_id: 'l10', due_date: now.toISOString(), done: false, priority: 'medium' },
  { id: 't6', title: 'Retorno Thiago Moraes', type: 'call', seller_key: 'ana', lead_id: 'l11', due_date: now.toISOString(), done: false, priority: 'medium' },
  { id: 't7', title: 'Negociação Sandra Duarte', type: 'call', seller_key: 'carla', lead_id: 'l12', due_date: now.toISOString(), done: true, priority: 'high' },
]

export const STAGE_LABELS = {
  0: 'Perdido',
  1: 'Novo',
  2: 'Contato',
  3: 'Proposta',
  4: 'Negociação',
  5: 'Ganho',
}

export const ORDER_STATUS_LABELS = {
  processing: 'Processando',
  in_transit: 'Em Trânsito',
  out_for_delivery: 'Saiu p/ Entrega',
  delivered: 'Entregue',
  returned: 'Devolvido',
  cancelled: 'Cancelado',
}

export const COLLECTION_STATUS_LABELS = {
  new: 'Novo',
  pending: 'Pendente',
  contacted: 'Contatado',
  agreement: 'Acordo',
  paid: 'Pago',
  failed: 'Falhou',
}
