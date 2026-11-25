package app.practice.beta;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

// Раз в 30 минут (UpdatePlugin.configure): проверить обновление, пока приложение закрыто (UpdateBg.check). Сбой не страшен: следующая проверка — через полчаса.
public class UpdateWorker extends Worker {
    public UpdateWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

    @NonNull
    @Override
    public Result doWork() {
        try { UpdateBg.check(getApplicationContext()); } catch (Exception ignored) { }
        return Result.success();
    }
}
