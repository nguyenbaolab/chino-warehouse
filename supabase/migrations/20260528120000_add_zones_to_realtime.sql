-- C1: zones must be in supabase_realtime publication for postgres_changes events
ALTER PUBLICATION supabase_realtime ADD TABLE zones;
