package org.ccpc.skymetrics.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class TrajectoryData implements Serializable {
    private List<Double> time;
    private List<Double> x_east;
    private List<Double> y_north;
    private List<Double> z_up;
    private ReferenceData reference;
    private List<Double> lat_deg;
    private List<Double> lon_deg;
    private List<Double> alt_m;
    private List<Double> speed_horizontal_m_s;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReferenceData implements Serializable {
        private Double lat0_deg;
        private Double lon0_deg;
        private Double alt0_m;
        private String frame;
    }
}