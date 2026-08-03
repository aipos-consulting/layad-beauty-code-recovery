-- LAYAD 관리자 프로토타입 테스트 데이터 일괄 삭제
-- 실제 사용자 데이터는 삭제하지 않습니다.

begin;

delete from public.product_analysis_requests
where session_id in (
  select id
  from public.test_sessions
  where geo_source = 'layad_admin_demo_20260803'
);

delete from public.test_answers
where session_id in (
  select id
  from public.test_sessions
  where geo_source = 'layad_admin_demo_20260803'
);

delete from public.test_sessions
where geo_source = 'layad_admin_demo_20260803';

commit;

-- 삭제 확인
select count(*) as remaining_demo_sessions
from public.test_sessions
where geo_source = 'layad_admin_demo_20260803';
