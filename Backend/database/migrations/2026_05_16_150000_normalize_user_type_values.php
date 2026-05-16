<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $values = [
        'CUSTOMER',
        'COURIER',
        'CHAIN_MANAGER',
        'LOCAL_MANAGER',
    ];

    private array $legacyValues = [
        'customer',
        'courier',
        'chain_manager',
        'local_manager',
    ];

    public function up(): void
    {
        $this->normalizeTable('users');
        $this->normalizeTable('chat_participants');
    }

    public function down(): void
    {
        $this->denormalizeTable('users');
        $this->denormalizeTable('chat_participants');
    }

    private function normalizeTable(string $table): void
    {
        if (! Schema::hasColumn($table, 'user_type')) {
            return;
        }

        $this->allowValues($table, array_merge($this->legacyValues, $this->values), 'CUSTOMER');

        DB::table($table)->where('user_type', 'customer')->update(['user_type' => 'CUSTOMER']);
        DB::table($table)->where('user_type', 'courier')->update(['user_type' => 'COURIER']);
        DB::table($table)->where('user_type', 'chain_manager')->update(['user_type' => 'CHAIN_MANAGER']);
        DB::table($table)->where('user_type', 'local_manager')->update(['user_type' => 'LOCAL_MANAGER']);

        $this->allowValues($table, $this->values, 'CUSTOMER');
    }

    private function denormalizeTable(string $table): void
    {
        if (! Schema::hasColumn($table, 'user_type')) {
            return;
        }

        $this->allowValues($table, array_merge($this->legacyValues, $this->values), 'customer');

        DB::table($table)->where('user_type', 'CUSTOMER')->update(['user_type' => 'customer']);
        DB::table($table)->where('user_type', 'COURIER')->update(['user_type' => 'courier']);
        DB::table($table)->where('user_type', 'CHAIN_MANAGER')->update(['user_type' => 'chain_manager']);
        DB::table($table)->where('user_type', 'LOCAL_MANAGER')->update(['user_type' => 'local_manager']);

        $this->allowValues($table, $this->legacyValues, 'customer');
    }

    private function allowValues(string $table, array $values, string $default): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $this->allowPostgresValues($table, $values, $default);

            return;
        }

        if ($driver === 'mysql' || $driver === 'mariadb') {
            $quotedValues = $this->quotedValues($values);
            $quotedDefault = DB::getPdo()->quote($default);

            DB::statement("ALTER TABLE {$table} MODIFY user_type ENUM({$quotedValues}) NOT NULL DEFAULT {$quotedDefault}");
        }
    }

    private function allowPostgresValues(string $table, array $values, string $default): void
    {
        $constraints = DB::select(<<<SQL
            SELECT con.conname
            FROM pg_constraint con
            INNER JOIN pg_class rel ON rel.oid = con.conrelid
            INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
            WHERE rel.relname = ?
              AND con.contype = 'c'
              AND pg_get_constraintdef(con.oid) ILIKE '%user_type%'
        SQL, [$table]);

        foreach ($constraints as $constraint) {
            DB::statement("ALTER TABLE {$table} DROP CONSTRAINT {$constraint->conname}");
        }

        $quotedValues = $this->quotedValues($values);
        $quotedDefault = DB::getPdo()->quote($default);

        DB::statement("ALTER TABLE {$table} ALTER COLUMN user_type SET DEFAULT {$quotedDefault}");
        DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_user_type_check CHECK (user_type IN ({$quotedValues}))");
    }

    private function quotedValues(array $values): string
    {
        return implode(', ', array_map(
            static fn (string $value): string => DB::getPdo()->quote($value),
            $values,
        ));
    }
};
