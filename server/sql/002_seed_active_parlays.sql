-- Seed data for active_parlays derived from parlayTemplates.json
-- Run AFTER 001_create_parlay_tables.sql
-- Safe to run multiple times if you keep the where-not-exists pattern or truncate first.

-- Optionally clear existing (uncomment if you want a clean reset)
-- truncate table public.active_parlays restart identity cascade;

insert into public.active_parlays (sport, player_id, player_name, stat, line, base_prob, raw_markets)
values
-- Basketball
('basketball','bbp1','Jayson Tatum','points',27.5,0.55,'{"id":"bb-001","stat":"points"}'),
('basketball','bbp1','Jayson Tatum','rebounds',8.5,0.53,'{"id":"bb-001","stat":"rebounds"}'),
('basketball','bbp2','Giannis Antetokounmpo','points',30.0,0.54,'{"id":"bb-002","stat":"points"}'),
('basketball','bbp2','Giannis Antetokounmpo','rebounds',11.5,0.57,'{"id":"bb-002","stat":"rebounds"}'),
('basketball','bbp3','Luka Doncic','points',32.5,0.54,'{"id":"bb-003","stat":"points"}'),
('basketball','bbp3','Luka Doncic','assists',8.5,0.53,'{"id":"bb-003","stat":"assists"}'),
('basketball','bbp4','Nikola Jokic','rebounds',11.0,0.56,'{"id":"bb-004","stat":"rebounds"}'),
('basketball','bbp4','Nikola Jokic','assists',9.0,0.55,'{"id":"bb-004","stat":"assists"}'),
('basketball','bbp5','Stephen Curry','points',30.0,0.52,'{"id":"bb-005","stat":"points"}'),
('basketball','bbp5','Stephen Curry','three_pointers_made',4.5,0.53,'{"id":"bb-005","stat":"three_pointers_made"}'),
('basketball','bbp6','LeBron James','points',25.5,0.55,'{"id":"bb-006","stat":"points"}'),
('basketball','bbp6','LeBron James','assists',7.0,0.54,'{"id":"bb-006","stat":"assists"}'),
('basketball','bbp7','Kevin Durant','points',28.0,0.54,'{"id":"bb-007","stat":"points"}'),
('basketball','bbp7','Kevin Durant','three_pointers_made',2.5,0.55,'{"id":"bb-007","stat":"three_pointers_made"}'),
('basketball','bbp8','Joel Embiid','points',31.0,0.55,'{"id":"bb-008","stat":"points"}'),
('basketball','bbp8','Joel Embiid','rebounds',10.0,0.58,'{"id":"bb-008","stat":"rebounds"}'),
('basketball','bbp9','Damian Lillard','points',29.5,0.52,'{"id":"bb-009","stat":"points"}'),
('basketball','bbp9','Damian Lillard','assists',6.5,0.53,'{"id":"bb-009","stat":"assists"}'),
('basketball','bbp10','James Harden','assists',9.5,0.55,'{"id":"bb-010","stat":"assists"}'),
('basketball','bbp10','James Harden','points',22.0,0.52,'{"id":"bb-010","stat":"points"}'),
('basketball','bbp11','Kyrie Irving','points',24.5,0.53,'{"id":"bb-011","stat":"points"}'),
('basketball','bbp11','Kyrie Irving','three_pointers_made',3.5,0.52,'{"id":"bb-011","stat":"three_pointers_made"}'),
('basketball','bbp12','Jrue Holiday','steals',1.5,0.51,'{"id":"bb-012","stat":"steals"}'),
('basketball','bbp12','Jrue Holiday','points',18.0,0.50,'{"id":"bb-012","stat":"points"}'),
('basketball','bbp13','Anthony Davis','rebounds',12.0,0.56,'{"id":"bb-013","stat":"rebounds"}'),
('basketball','bbp13','Anthony Davis','blocks',2.5,0.50,'{"id":"bb-013","stat":"blocks"}'),
('basketball','bbp14','Zion Williamson','points',23.5,0.52,'{"id":"bb-014","stat":"points"}'),
('basketball','bbp14','Zion Williamson','rebounds',6.5,0.51,'{"id":"bb-014","stat":"rebounds"}'),
('basketball','bbp15','Jalen Brunson','points',24.0,0.53,'{"id":"bb-015","stat":"points"}'),
('basketball','bbp15','Jalen Brunson','assists',6.0,0.52,'{"id":"bb-015","stat":"assists"}'),
-- Soccer
('soccer','scp1','Erling Haaland','goals',0.9,0.58,'{"id":"sc-001","stat":"goals"}'),
('soccer','scp1','Erling Haaland','shots_on_target',2.5,0.56,'{"id":"sc-001","stat":"shots_on_target"}'),
('soccer','scp2','Lionel Messi','goals',0.6,0.57,'{"id":"sc-002","stat":"goals"}'),
('soccer','scp2','Lionel Messi','chances_created',3.0,0.57,'{"id":"sc-002","stat":"chances_created"}'),
('soccer','scp3','Kylian Mbappé','shots_on_target',2.5,0.55,'{"id":"sc-003","stat":"shots_on_target"}'),
('soccer','scp3','Kylian Mbappé','goals',0.6,0.54,'{"id":"sc-003","stat":"goals"}'),
('soccer','scp4','Harry Kane','goals',0.7,0.56,'{"id":"sc-004","stat":"goals"}'),
('soccer','scp4','Harry Kane','shots_on_target',1.5,0.54,'{"id":"sc-004","stat":"shots_on_target"}'),
('soccer','scp5','Kevin De Bruyne','chances_created',3.0,0.56,'{"id":"sc-005","stat":"chances_created"}'),
('soccer','scp5','Kevin De Bruyne','assists',0.5,0.54,'{"id":"sc-005","stat":"assists"}'),
('soccer','scp6','Mohamed Salah','shots_on_target',1.5,0.54,'{"id":"sc-006","stat":"shots_on_target"}'),
('soccer','scp6','Mohamed Salah','goals',0.6,0.54,'{"id":"sc-006","stat":"goals"}'),
('soccer','scp7','Bukayo Saka','shots_on_target',1.5,0.53,'{"id":"sc-007","stat":"shots_on_target"}'),
('soccer','scp7','Bukayo Saka','chances_created',2.0,0.53,'{"id":"sc-007","stat":"chances_created"}'),
('soccer','scp8','Robert Lewandowski','goals',0.7,0.55,'{"id":"sc-008","stat":"goals"}'),
('soccer','scp8','Robert Lewandowski','shots_on_target',1.5,0.55,'{"id":"sc-008","stat":"shots_on_target"}'),
('soccer','scp9','Vinicius Junior','shots_on_target',1.5,0.53,'{"id":"sc-009","stat":"shots_on_target"}'),
('soccer','scp9','Vinicius Junior','goals',0.5,0.53,'{"id":"sc-009","stat":"goals"}'),
('soccer','scp10','Karim Benzema','goals',0.7,0.55,'{"id":"sc-010","stat":"goals"}'),
('soccer','scp10','Karim Benzema','shots_on_target',1.5,0.54,'{"id":"sc-010","stat":"shots_on_target"}'),
('soccer','scp11','Neymar Jr','chances_created',2.5,0.55,'{"id":"sc-011","stat":"chances_created"}'),
('soccer','scp11','Neymar Jr','goals',0.5,0.55,'{"id":"sc-011","stat":"goals"}'),
('soccer','scp12','Lautaro Martinez','goals',0.6,0.54,'{"id":"sc-012","stat":"goals"}'),
('soccer','scp12','Lautaro Martinez','shots_on_target',1.5,0.52,'{"id":"sc-012","stat":"shots_on_target"}'),
('soccer','scp13','Phil Foden','shots_on_target',1.5,0.52,'{"id":"sc-013","stat":"shots_on_target"}'),
('soccer','scp13','Phil Foden','chances_created',2.0,0.52,'{"id":"sc-013","stat":"chances_created"}'),
('soccer','scp14','Marcus Rashford','goals',0.6,0.52,'{"id":"sc-014","stat":"goals"}'),
('soccer','scp14','Marcus Rashford','shots_on_target',1.5,0.51,'{"id":"sc-014","stat":"shots_on_target"}'),
('soccer','scp15','Antoine Griezmann','chances_created',2.5,0.52,'{"id":"sc-015","stat":"chances_created"}'),
('soccer','scp15','Antoine Griezmann','shots_on_target',1.5,0.51,'{"id":"sc-015","stat":"shots_on_target"}'),
-- Football
('football','fbp1','Patrick Mahomes','passing_yards',285.5,0.55,'{"id":"fb-001","stat":"passing_yards"}'),
('football','fbp1','Patrick Mahomes','passing_touchdowns',2.0,0.54,'{"id":"fb-001","stat":"passing_touchdowns"}'),
('football','fbp2','Josh Allen','passing_yards',270.5,0.54,'{"id":"fb-002","stat":"passing_yards"}'),
('football','fbp2','Josh Allen','rushing_yards',42.5,0.53,'{"id":"fb-002","stat":"rushing_yards"}'),
('football','fbp3','Joe Burrow','passing_yards',270.5,0.54,'{"id":"fb-003","stat":"passing_yards"}'),
('football','fbp3','Joe Burrow','passing_touchdowns',2.0,0.54,'{"id":"fb-003","stat":"passing_touchdowns"}'),
('football','fbp4','Justin Jefferson','receiving_yards',92.5,0.56,'{"id":"fb-004","stat":"receiving_yards"}'),
('football','fbp4','Justin Jefferson','receptions',7.0,0.55,'{"id":"fb-004","stat":"receptions"}'),
('football','fbp5','Derrick Henry','rushing_yards',96.5,0.55,'{"id":"fb-005","stat":"rushing_yards"}'),
('football','fbp5','Derrick Henry','rushing_attempts',22.0,0.53,'{"id":"fb-005","stat":"rushing_attempts"}'),
('football','fbp6','Travis Kelce','receptions',7.0,0.56,'{"id":"fb-006","stat":"receptions"}'),
('football','fbp6','Travis Kelce','receiving_yards',86.5,0.55,'{"id":"fb-006","stat":"receiving_yards"}'),
('football','fbp7','Stefon Diggs','receiving_yards',86.5,0.54,'{"id":"fb-007","stat":"receiving_yards"}'),
('football','fbp7','Stefon Diggs','receptions',7.0,0.54,'{"id":"fb-007","stat":"receptions"}'),
('football','fbp8','Saquon Barkley','rushing_yards',84.5,0.53,'{"id":"fb-008","stat":"rushing_yards"}'),
('football','fbp8','Saquon Barkley','rushing_attempts',19.5,0.52,'{"id":"fb-008","stat":"rushing_attempts"}'),
('football','fbp9','Jalen Hurts','passing_yards',250.5,0.53,'{"id":"fb-009","stat":"passing_yards"}'),
('football','fbp9','Jalen Hurts','rushing_yards',44.5,0.53,'{"id":"fb-009","stat":"rushing_yards"}'),
('football','fbp10','Tyreek Hill','receiving_yards',88.5,0.55,'{"id":"fb-010","stat":"receiving_yards"}'),
('football','fbp10','Tyreek Hill','receptions',6.0,0.54,'{"id":"fb-010","stat":"receptions"}'),
('football','fbp11','Davante Adams','receiving_yards',88.5,0.55,'{"id":"fb-011","stat":"receiving_yards"}'),
('football','fbp11','Davante Adams','receptions',6.5,0.54,'{"id":"fb-011","stat":"receptions"}'),
('football','fbp12','Christian McCaffrey','rushing_yards',82.5,0.55,'{"id":"fb-012","stat":"rushing_yards"}'),
('football','fbp12','Christian McCaffrey','receiving_yards',38.5,0.52,'{"id":"fb-012","stat":"receiving_yards"}'),
('football','fbp13','Josh Jacobs','rushing_attempts',19.5,0.53,'{"id":"fb-013","stat":"rushing_attempts"}'),
('football','fbp13','Josh Jacobs','rushing_yards',82.5,0.53,'{"id":"fb-013","stat":"rushing_yards"}'),
('football','fbp14','Amon-Ra St. Brown','receiving_yards',78.5,0.54,'{"id":"fb-014","stat":"receiving_yards"}'),
('football','fbp14','Amon-Ra St. Brown','receptions',6.5,0.54,'{"id":"fb-014","stat":"receptions"}'),
('football','fbp15','Lamar Jackson','passing_touchdowns',2.0,0.55,'{"id":"fb-015","stat":"passing_touchdowns"}'),
('football','fbp15','Lamar Jackson','rushing_yards',62.5,0.55,'{"id":"fb-015","stat":"rushing_yards"}')
ON CONFLICT ON CONSTRAINT active_parlays_unique DO NOTHING;

-- Optional: prevent duplicates on re-run (example pattern)
-- delete from public.active_parlays a using (
--   select player_id, stat, row_number() over (partition by player_id, stat order by created_at) rn
--   from public.active_parlays
-- ) d where a.player_id=d.player_id and a.stat=d.stat and d.rn > 1;

-- Additional repeats and players to reach 20 players per sport and add varied lines
-- Ensure unique (player_id, stat, line)

-- Basketball repeats (existing players with new lines)
insert into public.active_parlays (sport, player_id, player_name, stat, line, base_prob, raw_markets) values
('basketball','bbp1','Jayson Tatum','points',26.5,0.56,'{"id":"bb-001","stat":"points","variant":"rep1"}'),
('basketball','bbp1','Jayson Tatum','points',28.5,0.54,'{"id":"bb-001","stat":"points","variant":"rep2"}'),
('basketball','bbp2','Giannis Antetokounmpo','rebounds',10.5,0.56,'{"id":"bb-002","stat":"rebounds","variant":"rep1"}'),
('basketball','bbp6','LeBron James','assists',6.5,0.55,'{"id":"bb-006","stat":"assists","variant":"rep1"}'),
('basketball','bbp7','Kevin Durant','three_pointers_made',3.0,0.54,'{"id":"bb-007","stat":"three_pointers_made","variant":"rep1"}')
ON CONFLICT ON CONSTRAINT active_parlays_unique DO NOTHING;

-- Basketball new players (to approach/ensure 20 unique players)
insert into public.active_parlays (sport, player_id, player_name, stat, line, base_prob, raw_markets) values
('basketball','bbp16','Devin Booker','points',27.0,0.54,'{"id":"bb-016","stat":"points"}'),
('basketball','bbp17','Kawhi Leonard','rebounds',6.5,0.52,'{"id":"bb-017","stat":"rebounds"}'),
('basketball','bbp18','Paul George','three_pointers_made',3.0,0.52,'{"id":"bb-018","stat":"three_pointers_made"}'),
('basketball','bbp19','Ja Morant','assists',7.0,0.53,'{"id":"bb-019","stat":"assists"}'),
('basketball','bbp20','Jimmy Butler','points',23.5,0.53,'{"id":"bb-020","stat":"points"}')
ON CONFLICT ON CONSTRAINT active_parlays_unique DO NOTHING;

-- Soccer repeats
insert into public.active_parlays (sport, player_id, player_name, stat, line, base_prob, raw_markets) values
('soccer','scp1','Erling Haaland','goals',1.1,0.57,'{"id":"sc-001","stat":"goals","variant":"rep1"}'),
('soccer','scp2','Lionel Messi','chances_created',3.5,0.58,'{"id":"sc-002","stat":"chances_created","variant":"rep1"}'),
('soccer','scp3','Kylian Mbappé','shots_on_target',3.0,0.56,'{"id":"sc-003","stat":"shots_on_target","variant":"rep1"}'),
('soccer','scp4','Harry Kane','shots_on_target',2.0,0.55,'{"id":"sc-004","stat":"shots_on_target","variant":"rep1"}'),
('soccer','scp5','Kevin De Bruyne','assists',0.6,0.56,'{"id":"sc-005","stat":"assists","variant":"rep1"}')
ON CONFLICT ON CONSTRAINT active_parlays_unique DO NOTHING;

-- Soccer new players
insert into public.active_parlays (sport, player_id, player_name, stat, line, base_prob, raw_markets) values
('soccer','scp16','Bruno Fernandes','chances_created',3.0,0.55,'{"id":"sc-016","stat":"chances_created"}'),
('soccer','scp17','Sadio Mané','shots_on_target',1.5,0.53,'{"id":"sc-017","stat":"shots_on_target"}'),
('soccer','scp18','Karim Adeyemi','goals',0.5,0.52,'{"id":"sc-018","stat":"goals"}'),
('soccer','scp19','Bukayo Saka','assists',0.5,0.53,'{"id":"sc-019","stat":"assists"}'),
('soccer','scp20','Rodrygo','shots_on_target',1.5,0.52,'{"id":"sc-020","stat":"shots_on_target"}')
ON CONFLICT ON CONSTRAINT active_parlays_unique DO NOTHING;

-- Football repeats
insert into public.active_parlays (sport, player_id, player_name, stat, line, base_prob, raw_markets) values
('football','fbp1','Patrick Mahomes','passing_yards',295.5,0.56,'{"id":"fb-001","stat":"passing_yards","variant":"rep1"}'),
('football','fbp2','Josh Allen','rushing_yards',45.5,0.54,'{"id":"fb-002","stat":"rushing_yards","variant":"rep1"}'),
('football','fbp3','Joe Burrow','passing_touchdowns',2.5,0.55,'{"id":"fb-003","stat":"passing_touchdowns","variant":"rep1"}'),
('football','fbp4','Justin Jefferson','receptions',7.5,0.56,'{"id":"fb-004","stat":"receptions","variant":"rep1"}'),
('football','fbp5','Derrick Henry','rushing_attempts',23.5,0.54,'{"id":"fb-005","stat":"rushing_attempts","variant":"rep1"}')
ON CONFLICT ON CONSTRAINT active_parlays_unique DO NOTHING;

-- Football new players
insert into public.active_parlays (sport, player_id, player_name, stat, line, base_prob, raw_markets) values
('football','fbp16','Justin Herbert','passing_yards',280.5,0.54,'{"id":"fb-016","stat":"passing_yards"}'),
('football','fbp17','JaMarr Chase','receiving_yards',88.5,0.55,'{"id":"fb-017","stat":"receiving_yards"}'),
('football','fbp18','George Kittle','receptions',5.5,0.54,'{"id":"fb-018","stat":"receptions"}'),
('football','fbp19','Nick Chubb','rushing_yards',92.5,0.55,'{"id":"fb-019","stat":"rushing_yards"}'),
('football','fbp20','CeeDee Lamb','receiving_yards',86.5,0.54,'{"id":"fb-020","stat":"receiving_yards"}')
ON CONFLICT ON CONSTRAINT active_parlays_unique DO NOTHING;
