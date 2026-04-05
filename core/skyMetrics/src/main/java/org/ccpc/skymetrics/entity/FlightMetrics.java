package org.ccpc.skymetrics.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Table(name = "flight_metrics")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlightMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "flight_duration_sec")
    private Double flightDurationSec;

    @Column(name = "total_distance_m")
    private Double totalDistanceM;

    @Column(name = "max_altitude_m")
    private Double maxAltitudeM;

    @Column(name = "max_horizontal_speed_m_s")
    private Double maxHorizontalSpeedMs;

    @Column(name = "max_vertical_speed_m_s")
    private Double maxVerticalSpeedMs;

    @Column(name = "max_acceleration_m_s2")
    private Double maxAccelerationMs2;

    @Column(name = "altitude_gain_m")
    private Double altitudeGainM;

    @Column(name = "max_speed_from_imu_trapz_m_s")
    private Double maxSpeedFromImuTrapzMs;

    @OneToOne(mappedBy = "metrics")
    private FlightSession flightSession;
}