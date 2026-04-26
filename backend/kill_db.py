import sqlalchemy as sa
e=sa.create_engine('postgresql+psycopg://postgres:postgres@localhost:5432/postgres')
c=e.connect()
c.execute(sa.text("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'countit' AND pid != pg_backend_pid()"))
c.commit()
c.close()
print("Terminated connections")
