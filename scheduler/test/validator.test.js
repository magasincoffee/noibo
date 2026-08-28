const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, HARD } = require('../src/validator');

function base() {
  return {
    profiles:[{id:'u1',status:'ACTIVE',access_scope:'STORE1'},{id:'u2',status:'ACTIVE',access_scope:'STORE1'}],
    stores:[{id:'s1',code:'STORE1',status:'ACTIVE'}],
    employee_grades:[{user_id:'u1',hourly_rate:100},{user_id:'u2',hourly_rate:120}],
    employee_constraints:[
      {user_id:'u1',max_daily_hours:8,max_weekly_hours:20,min_rest_hours:0,allowed_store_ids:['s1'],mentor_required:false},
      {user_id:'u2',max_daily_hours:8,max_weekly_hours:20,min_rest_hours:0,allowed_store_ids:['s1'],mentor_required:false},
    ],
    employee_availability:[
      {user_id:'u1',work_date:'2026-08-24',start_time:'08:00',end_time:'12:00',availability_type:'AVAILABLE'},
      {user_id:'u2',work_date:'2026-08-24',start_time:'08:00',end_time:'12:00',availability_type:'AVAILABLE'},
    ],
    employee_skills:[
      {user_id:'u1',skill_code:'BARISTA',level:3,can_mentor:true,status:'ACTIVE'},
      {user_id:'u2',skill_code:'BARISTA',level:2,can_mentor:false,status:'ACTIVE'},
    ],
    staffing_requirements:[{id:'r1',store_id:'s1',work_date:'2026-08-24',start_time:'08:00',end_time:'12:00',skill_code:'BARISTA',min_skill_level:2,minimum_headcount:1,target_headcount:1,maximum_headcount:1}],
    work_schedules:[]
  };
}

test('valid draft passes independent gate',()=>{
  const result=validate(base(),{rule_version:'RULE_V1',assignments:[{assignment_key:'a1',requirement_id:'r1',user_id:'u2',store_id:'s1',work_date:'2026-08-24',start_time:'08:00',end_time:'12:00',skill_code:'BARISTA',skill_level:2}]});
  assert.equal(result.valid,true);
});

test('draft overlap is detected',()=>{
  const b=base();
  const result=validate(b,{assignments:[
    {assignment_key:'a1',requirement_id:'r1',user_id:'u1',store_id:'s1',work_date:'2026-08-24',start_time:'08:00',end_time:'12:00',skill_code:'BARISTA',skill_level:3},
    {assignment_key:'a2',requirement_id:'r1',user_id:'u1',store_id:'s1',work_date:'2026-08-24',start_time:'10:00',end_time:'11:00',skill_code:'BARISTA',skill_level:3}
  ]});
  assert.ok(result.violations.some(v=>v.code===HARD.EMPLOYEE_ASSIGNMENT_OVERLAP));
});

test('minimum shortage is detected',()=>{
  const result=validate(base(),{assignments:[]});
  assert.ok(result.violations.some(v=>v.code===HARD.MINIMUM_COVERAGE_SHORTAGE));
});

test('mentor requirement is hard blocking',()=>{
  const b=base(); b.employee_constraints[1].mentor_required=true;
  const result=validate(b,{assignments:[{assignment_key:'a1',requirement_id:'r1',user_id:'u2',store_id:'s1',work_date:'2026-08-24',start_time:'08:00',end_time:'12:00',skill_code:'BARISTA',skill_level:2}]});
  assert.ok(result.violations.some(v=>v.code===HARD.MENTOR_REQUIRED));
});
