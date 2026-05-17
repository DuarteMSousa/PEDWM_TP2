<?php

namespace Tests\Unit\Services;

use App\DTOs\User\CreateUserDTO;
use App\DTOs\User\UpdateUserDTO;
use App\Repositories\UserRepository\UserRepositoryInterface;
use App\Services\UserService\UserService;
use Mockery;
use Tests\TestCase;

class UserServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }

    public function test_get_by_id_delegates_to_repository(): void
    {
        $repository = Mockery::mock(UserRepositoryInterface::class);
        $repository->shouldReceive('findById')
            ->once()
            ->with('user-1')
            ->andReturn(['id' => 'user-1']);

        $this->assertSame(['id' => 'user-1'], (new UserService($repository))->getById('user-1'));
    }

    public function test_create_user_hashes_password_before_delegating_to_repository(): void
    {
        $repository = Mockery::mock(UserRepositoryInterface::class);
        $repository->shouldReceive('createUser')
            ->once()
            ->with(Mockery::on(function (CreateUserDTO $data): bool {
                return $data->name === 'Ana'
                    && $data->email === 'ana@example.test'
                    && $data->password !== 'secret'
                    && password_verify('secret', $data->password);
            }))
            ->andReturn(['id' => 'user-1']);

        $result = (new UserService($repository))->createUser(new CreateUserDTO(
            name: 'Ana',
            email: 'ana@example.test',
            password: 'secret',
        ));

        $this->assertSame(['id' => 'user-1'], $result);
    }

    public function test_update_and_delete_delegate_to_repository(): void
    {
        $repository = Mockery::mock(UserRepositoryInterface::class);
        $update = new UpdateUserDTO(name: 'Ana');

        $repository->shouldReceive('updateUser')
            ->once()
            ->with('user-1', $update)
            ->andReturn(['id' => 'user-1', 'name' => 'Ana']);

        $repository->shouldReceive('deleteUser')
            ->once()
            ->with('user-1')
            ->andReturn(true);

        $service = new UserService($repository);

        $this->assertSame(['id' => 'user-1', 'name' => 'Ana'], $service->updateUser('user-1', $update));
        $this->assertTrue($service->deleteUser('user-1'));
    }
}
