from django.db import models
from django.utils import timezone
import uuid

class User(models.Model):
    u_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_index=True)
    wallet = models.CharField(max_length=44, unique=True, db_index=True)
    nb_bet = models.PositiveIntegerField(default=0)
    total_volume = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_payout = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_gain = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ref_id = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    ref_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    referral_gain = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    country_code = models.CharField(max_length=2, default='zz')
    last_login = models.DateTimeField(default=timezone.now)
    creation_date = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(nb_bet__gte=0), name='user_check_nb_bet_gte_0'),
            models.CheckConstraint(check=models.Q(total_volume__gte=0), name='user_check_total_volume_gte_0'),
            models.CheckConstraint(check=models.Q(total_payout__gte=0), name='user_check_total_payout_gte_0'),
            models.CheckConstraint(check=models.Q(total_gain__gte=0), name='user_check_total_gain_gte_0'),
        ]

class Fighter(models.Model):
    f_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_index=True)
    name = models.CharField(max_length=100, unique=True)
    nb_fight = models.PositiveIntegerField(default=0)
    nb_bet = models.PositiveIntegerField(default=0)
    win = models.PositiveIntegerField(default=0)
    lose = models.PositiveIntegerField(default=0)
    elo = models.DecimalField(max_digits=10, decimal_places=2, default=1000)

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(nb_fight__gte=0), name='fighter_check_nb_fight_gte_0'),
            models.CheckConstraint(check=models.Q(nb_bet__gte=0), name='fighter_check_nb_bet_gte_0'),
            models.CheckConstraint(check=models.Q(win__gte=0), name='fighter_check_win_gte_0'),
            models.CheckConstraint(check=models.Q(lose__gte=0), name='fighter_check_lose_gte_0'),
            models.CheckConstraint(check=models.Q(elo__gte=0), name='fighter_check_elo_gte_0'),
        ]

class Match(models.Model):
    m_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_index=True)
    red_id = models.ForeignKey(Fighter, related_name='red_matches', on_delete=models.CASCADE)
    blue_id = models.ForeignKey(Fighter, related_name='blue_matches', on_delete=models.CASCADE)
    winner = models.ForeignKey(Fighter, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_matches')
    nb_bet = models.PositiveIntegerField(default=0)
    vol_blue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    vol_red = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    creation_date = models.DateTimeField(default=timezone.now)
    duration = models.DurationField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(nb_bet__gte=0), name='match_check_nb_bet_gte_0'),
            models.CheckConstraint(check=models.Q(vol_blue__gte=0), name='match_check_vol_blue_gte_0'),
            models.CheckConstraint(check=models.Q(vol_red__gte=0), name='match_check_vol_red_gte_0'),
        ]

class Bet(models.Model):
    b_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    m_id = models.ForeignKey(Match, on_delete=models.CASCADE)
    u_id = models.ForeignKey(User, on_delete=models.CASCADE)
    f_id = models.ForeignKey(Fighter, on_delete=models.CASCADE)
    team = models.CharField(max_length=4, choices=[('red', 'red'), ('blue', 'blue')], default='red')
    tx_in = models.CharField(max_length=1232)
    success_in = models.BooleanField(null=True, blank=True)
    tx_out = models.CharField(max_length=1232, null=True, blank=True)
    success_out = models.BooleanField(null=True, blank=True)
    volume = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payout = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    invalid_match = models.BooleanField(null=True, blank=True, default=None)
    creation_date = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(volume__gte=0), name='bet_check_volume_gte_0'),
            models.CheckConstraint(check=models.Q(payout__gte=0), name='bet_check_payout_gte_0'),
        ]

class Global(models.Model):
    g_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    day = models.DateTimeField(default=timezone.now)
    global_bet = models.PositiveIntegerField(default=0)
    global_fail = models.PositiveIntegerField(default=0)
    global_volume_sol = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sol_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(global_bet__gte=0), name='global_check_global_bet_gte_0'),
            models.CheckConstraint(check=models.Q(global_fail__gte=0), name='global_check_global_fail_gte_0'),
            models.CheckConstraint(check=models.Q(global_volume_sol__gte=0), name='global_check_global_volume_sol_gte_0'),
            models.CheckConstraint(check=models.Q(sol_price__gte=0), name='global_check_sol_price_gte_0'),
        ]