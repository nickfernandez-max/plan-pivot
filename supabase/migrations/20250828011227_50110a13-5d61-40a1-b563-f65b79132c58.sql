-- Fix Bob Smith's Marketing membership to start in September instead of October
-- This closes the gap between his Engineering (ends Aug) and Marketing (should start Sep) memberships

UPDATE team_memberships 
SET start_month = '2025-09-01',
    updated_at = now()
WHERE team_member_id = '5fbab560-37c5-476b-be34-ee59a04596fc' 
  AND start_month = '2025-10-01';